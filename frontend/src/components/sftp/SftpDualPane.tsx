import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
    ArrowDownToLine,
    ArrowUpToLine,
    ChevronUp,
    FilePen,
    FolderPlus,
    HardDrive,
    Pencil,
    Server,
    Shield,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
    type FileEntry,
    joinLocalPath,
    joinRemotePath,
    parentLocalPath,
    parentRemotePath,
} from "@/lib/fileEntry";
import { parseChmodMode } from "@/lib/chmod";
import { Service as LocalFsService } from "../../../bindings/terminator-desktop/backend/internal/services/localfs";
import { SshService } from "../../../bindings/terminator-desktop/backend/internal/services/ssh";
import { parseAppError } from "@/lib/error";
import { toast } from "sonner";
import {
    SftpPromptDialog,
    type SftpPromptMode,
} from "@/components/sftp/SftpPromptDialog";
import { SftpFileList } from "@/components/sftp/SftpFileList";

interface SftpDualPaneProps {
    sessionId: string;
    remoteLabel: string;
}

interface PendingRemoteEdit {
    remotePath: string;
    tempPath: string;
    name: string;
}

function FilePaneHeader({
    title,
    icon,
    path,
    onGoUp,
    canGoUp,
    actions,
}: {
    title: string;
    icon: ReactNode;
    path: string;
    onGoUp: () => void;
    canGoUp: boolean;
    actions?: ReactNode;
}) {
    return (
        <div className="flex shrink-0 flex-col gap-1 border-b border-border bg-muted/30 px-2 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
                {icon}
                <span className="min-w-0 flex-1 truncate">{title}</span>
                {actions}
            </div>
            <div className="flex items-center gap-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    disabled={!canGoUp}
                    onClick={onGoUp}
                >
                    <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="truncate font-mono text-xs text-muted-foreground">
                    {path}
                </span>
            </div>
        </div>
    );
}

export function SftpDualPane({ sessionId, remoteLabel }: SftpDualPaneProps) {
    const { t } = useTranslation("sftp");

    const [localPath, setLocalPath] = useState("");
    const [remotePath, setRemotePath] = useState(".");
    const [localEntries, setLocalEntries] = useState<FileEntry[]>([]);
    const [remoteEntries, setRemoteEntries] = useState<FileEntry[]>([]);
    const [localLoading, setLocalLoading] = useState(true);
    const [remoteLoading, setRemoteLoading] = useState(true);
    const [selectedLocal, setSelectedLocal] = useState<FileEntry | null>(null);
    const [selectedRemote, setSelectedRemote] = useState<FileEntry | null>(null);
    const [transferring, setTransferring] = useState(false);
    const [promptMode, setPromptMode] = useState<SftpPromptMode | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
    const [pendingEdit, setPendingEdit] = useState<PendingRemoteEdit | null>(null);

    const loadLocal = useCallback(async (dir: string) => {
        setLocalLoading(true);
        try {
            const list = await LocalFsService.ListDir(dir);
            setLocalPath(dir);
            setLocalEntries(list ?? []);
            setSelectedLocal(null);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setLocalLoading(false);
        }
    }, []);

    const loadRemote = useCallback(
        async (dir: string) => {
            setRemoteLoading(true);
            try {
                const list = await SshService.SftpList(sessionId, dir);
                setRemotePath(dir);
                setRemoteEntries(list ?? []);
                setSelectedRemote(null);
            } catch (error) {
                toast.error(parseAppError(error).message);
            } finally {
                setRemoteLoading(false);
            }
        },
        [sessionId],
    );

    useEffect(() => {
        void (async () => {
            try {
                const home = await LocalFsService.HomeDir();
                await loadLocal(home);
            } catch (error) {
                toast.error(parseAppError(error).message);
                setLocalLoading(false);
            }
        })();
    }, [loadLocal]);

    useEffect(() => {
        void loadRemote(".");
    }, [loadRemote]);

    const uploadToRemote = async (entry?: FileEntry) => {
        const file = entry ?? selectedLocal;
        if (!file || file.isDir) return;
        setTransferring(true);
        const dest = joinRemotePath(remotePath, file.name);
        try {
            await SshService.SftpUpload(sessionId, file.path, dest);
            toast.success(t("upload_success", { name: file.name }));
            await loadRemote(remotePath);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const downloadToLocal = async (entry?: FileEntry) => {
        const file = entry ?? selectedRemote;
        if (!file || file.isDir) return;
        setTransferring(true);
        const dest = joinLocalPath(localPath, file.name);
        try {
            await SshService.SftpDownload(sessionId, file.path, dest);
            toast.success(t("download_success", { name: file.name }));
            await loadLocal(localPath);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const handlePromptSubmit = async (value: string) => {
        const mode = promptMode;
        setPromptMode(null);
        if (!mode) return;

        setTransferring(true);
        try {
            if (mode === "mkdir") {
                const dest = joinRemotePath(remotePath, value);
                await SshService.SftpMkdir(sessionId, dest);
                toast.success(t("mkdir_success", { name: value }));
                await loadRemote(remotePath);
                return;
            }

            if (!selectedRemote) return;

            if (mode === "rename") {
                const dest =
                    value.includes("/") || value.startsWith(".")
                        ? value
                        : joinRemotePath(parentRemotePath(selectedRemote.path), value);
                await SshService.SftpRename(sessionId, selectedRemote.path, dest);
                toast.success(t("rename_success", { name: value }));
                await loadRemote(remotePath);
                return;
            }

            if (mode === "chmod") {
                const fileMode = parseChmodMode(value);
                if (fileMode === null) {
                    toast.error(t("chmod_invalid"));
                    return;
                }
                await SshService.SftpChmod(sessionId, selectedRemote.path, fileMode);
                toast.success(t("chmod_success", { name: selectedRemote.name }));
                await loadRemote(remotePath);
            }
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const requestDelete = (entry: FileEntry) => {
        setSelectedRemote(entry);
        setDeleteTarget(entry);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        const target = deleteTarget ?? selectedRemote;
        if (!target) return;
        setDeleteConfirmOpen(false);
        setDeleteTarget(null);
        setTransferring(true);
        try {
            await SshService.SftpRemove(sessionId, target.path);
            toast.success(t("delete_success", { name: target.name }));
            await loadRemote(remotePath);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const openRename = (entry: FileEntry) => {
        setSelectedRemote(entry);
        setPromptMode("rename");
    };

    const openChmod = (entry: FileEntry) => {
        setSelectedRemote(entry);
        setPromptMode("chmod");
    };

    const startRemoteEdit = async (entry?: FileEntry) => {
        const file = entry ?? selectedRemote;
        if (!file || file.isDir) return;
        setTransferring(true);
        try {
            const tempPath = await SshService.SftpPrepareEdit(sessionId, file.path);
            await LocalFsService.OpenPath(tempPath);
            setPendingEdit({
                remotePath: file.path,
                tempPath,
                name: file.name,
            });
            toast.success(t("edit_started", { name: file.name }));
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const uploadPendingEdit = async () => {
        if (!pendingEdit) return;
        setTransferring(true);
        try {
            await SshService.SftpUpload(
                sessionId,
                pendingEdit.tempPath,
                pendingEdit.remotePath,
            );
            toast.success(t("upload_edit_success", { name: pendingEdit.name }));
            await loadRemote(remotePath);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const dismissPendingEdit = async () => {
        if (pendingEdit) {
            try {
                await LocalFsService.RemovePath(pendingEdit.tempPath);
            } catch {
                // temp file may already be gone
            }
        }
        setPendingEdit(null);
    };

    const localCanGoUp =
        localPath !== "/" &&
        localPath !== "" &&
        parentLocalPath(localPath) !== localPath;

    const remoteCanGoUp = remotePath !== "/" && remotePath !== ".";

    const remoteBusy = transferring || remoteLoading;
    const hasRemoteSelection = Boolean(selectedRemote);

    const remoteToolbar = (
        <div
            className="flex shrink-0 items-center gap-0.5"
            role="toolbar"
            aria-label={t("remote_actions")}
        >
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={remoteBusy}
                title={t("mkdir")}
                onClick={() => setPromptMode("mkdir")}
            >
                <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={remoteBusy || !hasRemoteSelection}
                title={t("rename")}
                onClick={() => selectedRemote && openRename(selectedRemote)}
            >
                <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={remoteBusy || !hasRemoteSelection}
                title={t("delete")}
                onClick={() => selectedRemote && requestDelete(selectedRemote)}
            >
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={remoteBusy || !hasRemoteSelection}
                title={t("chmod")}
                onClick={() => selectedRemote && openChmod(selectedRemote)}
            >
                <Shield className="h-3.5 w-3.5" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={
                    remoteBusy ||
                    !selectedRemote ||
                    selectedRemote.isDir
                }
                title={t("edit_remote")}
                onClick={() => void startRemoteEdit()}
            >
                <FilePen className="h-3.5 w-3.5" />
            </Button>
        </div>
    );

    return (
        <div className="flex h-full min-h-0 flex-col">
            {pendingEdit && (
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-primary/10 px-3 py-2 text-sm">
                    <span>{t("edit_banner", { name: pendingEdit.name })}</span>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            size="sm"
                            disabled={transferring}
                            onClick={() => void uploadPendingEdit()}
                        >
                            <ArrowUpToLine className="mr-1.5 h-4 w-4" />
                            {t("upload_edit")}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={transferring}
                            onClick={() => void dismissPendingEdit()}
                        >
                            {t("dismiss_edit")}
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={transferring || !selectedLocal || selectedLocal.isDir}
                    onClick={() => void uploadToRemote(selectedLocal ?? undefined)}
                    title={t("upload_hint")}
                >
                    <ArrowUpToLine className="mr-1.5 h-4 w-4" />
                    {t("upload")}
                </Button>
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                        transferring || !selectedRemote || selectedRemote.isDir
                    }
                    onClick={() => void downloadToLocal(selectedRemote ?? undefined)}
                    title={t("download_hint")}
                >
                    <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                    {t("download")}
                </Button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-[1fr_auto_1fr] gap-px bg-border">
                <div className="flex min-h-0 min-w-0 flex-col bg-card">
                    <FilePaneHeader
                        title={t("local_title")}
                        icon={<HardDrive className="h-4 w-4" />}
                        path={localPath}
                        canGoUp={localCanGoUp}
                        onGoUp={() => void loadLocal(parentLocalPath(localPath))}
                    />
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <SftpFileList
                            side="local"
                            entries={localEntries}
                            loading={localLoading}
                            selectedPath={selectedLocal?.path ?? null}
                            busy={transferring}
                            onSelect={setSelectedLocal}
                            onOpenDir={(e) => void loadLocal(e.path)}
                            onUpload={(e) => void uploadToRemote(e)}
                        />
                    </div>
                </div>

                <div className="flex w-8 flex-col items-center justify-center gap-2 bg-muted/20 py-4">
                    <span className="text-muted-foreground" title={t("upload_hint")}>
                        →
                    </span>
                    <span className="text-muted-foreground" title={t("download_hint")}>
                        ←
                    </span>
                </div>

                <div className="flex min-h-0 min-w-0 flex-col bg-card">
                    <FilePaneHeader
                        title={remoteLabel}
                        icon={<Server className="h-4 w-4" />}
                        path={remotePath}
                        canGoUp={remoteCanGoUp}
                        onGoUp={() => void loadRemote(parentRemotePath(remotePath))}
                        actions={remoteToolbar}
                    />
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <SftpFileList
                            side="remote"
                            entries={remoteEntries}
                            loading={remoteLoading}
                            selectedPath={selectedRemote?.path ?? null}
                            busy={remoteBusy}
                            onSelect={setSelectedRemote}
                            onOpenDir={(e) => void loadRemote(e.path)}
                            onDownload={(e) => void downloadToLocal(e)}
                            onRename={openRename}
                            onDelete={requestDelete}
                            onChmod={openChmod}
                            onEdit={(e) => void startRemoteEdit(e)}
                            onMkdir={() => setPromptMode("mkdir")}
                        />
                    </div>
                </div>
            </div>

            <SftpPromptDialog
                mode={promptMode}
                initialValue={
                    promptMode === "rename" ? (selectedRemote?.name ?? "") : ""
                }
                onClose={() => setPromptMode(null)}
                onSubmit={(value) => void handlePromptSubmit(value)}
            />

            <ConfirmModal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setDeleteTarget(null);
                }}
                onConfirm={() => void confirmDelete()}
                title={t("delete_title")}
                description={t("delete_description", {
                    name: (deleteTarget ?? selectedRemote)?.name ?? "",
                })}
            />
        </div>
    );
}
