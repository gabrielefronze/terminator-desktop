import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
    ArrowDownToLine,
    ArrowUpToLine,
    ChevronUp,
    File,
    Folder,
    HardDrive,
    Server,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    type FileEntry,
    formatFileSize,
    joinLocalPath,
    joinRemotePath,
    parentLocalPath,
    parentRemotePath,
} from "@/lib/fileEntry";
import { Service as LocalFsService } from "../../../bindings/terminator-desktop/backend/internal/services/localfs";
import { SshService } from "../../../bindings/terminator-desktop/backend/internal/services/ssh";
import { parseAppError } from "@/lib/error";
import { toast } from "sonner";

interface SftpDualPaneProps {
    sessionId: string;
    remoteLabel: string;
}

function FilePaneHeader({
    title,
    icon,
    path,
    onGoUp,
    canGoUp,
}: {
    title: string;
    icon: ReactNode;
    path: string;
    onGoUp: () => void;
    canGoUp: boolean;
}) {
    return (
        <div className="flex shrink-0 flex-col gap-1 border-b border-border bg-muted/30 px-2 py-2">
            <div className="flex items-center gap-2 text-sm font-medium">
                {icon}
                <span className="truncate">{title}</span>
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

function FileList({
    entries,
    loading,
    selectedPath,
    onSelect,
    onOpenDir,
}: {
    entries: FileEntry[];
    loading: boolean;
    selectedPath: string | null;
    onSelect: (entry: FileEntry) => void;
    onOpenDir: (entry: FileEntry) => void;
}) {
    const { t } = useTranslation("sftp");

    if (loading) {
        return (
            <p className="px-3 py-4 text-xs text-muted-foreground">
                {t("loading")}
            </p>
        );
    }

    if (entries.length === 0) {
        return (
            <p className="px-3 py-4 text-xs text-muted-foreground">
                {t("empty_dir")}
            </p>
        );
    }

    return (
        <ul className="p-1">
            {entries.map((entry) => (
                <li key={entry.path}>
                    <button
                        type="button"
                        className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                            selectedPath === entry.path &&
                                !entry.isDir &&
                                "bg-primary/15 ring-1 ring-primary/30",
                        )}
                        onClick={() => {
                            if (entry.isDir) {
                                onOpenDir(entry);
                            } else {
                                onSelect(entry);
                            }
                        }}
                        onDoubleClick={() => {
                            if (entry.isDir) {
                                onOpenDir(entry);
                            }
                        }}
                    >
                        {entry.isDir ? (
                            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                            {entry.name}
                        </span>
                        {!entry.isDir && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {formatFileSize(entry.size)}
                            </span>
                        )}
                    </button>
                </li>
            ))}
        </ul>
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
    const [selectedRemote, setSelectedRemote] = useState<FileEntry | null>(
        null,
    );
    const [transferring, setTransferring] = useState(false);

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

    const uploadToRemote = async () => {
        if (!selectedLocal || selectedLocal.isDir) return;
        setTransferring(true);
        const dest = joinRemotePath(remotePath, selectedLocal.name);
        try {
            await SshService.SftpUpload(
                sessionId,
                selectedLocal.path,
                dest,
            );
            toast.success(t("upload_success", { name: selectedLocal.name }));
            await loadRemote(remotePath);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const downloadToLocal = async () => {
        if (!selectedRemote || selectedRemote.isDir) return;
        setTransferring(true);
        const dest = joinLocalPath(localPath, selectedRemote.name);
        try {
            await SshService.SftpDownload(
                sessionId,
                selectedRemote.path,
                dest,
            );
            toast.success(
                t("download_success", { name: selectedRemote.name }),
            );
            await loadLocal(localPath);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setTransferring(false);
        }
    };

    const localCanGoUp =
        localPath !== "/" &&
        localPath !== "" &&
        parentLocalPath(localPath) !== localPath;

    const remoteCanGoUp = remotePath !== "/" && remotePath !== ".";

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border bg-muted/20 px-3 py-2">
                <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={
                        transferring || !selectedLocal || selectedLocal.isDir
                    }
                    onClick={() => void uploadToRemote()}
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
                    onClick={() => void downloadToLocal()}
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
                        <FileList
                            entries={localEntries}
                            loading={localLoading}
                            selectedPath={selectedLocal?.path ?? null}
                            onSelect={setSelectedLocal}
                            onOpenDir={(e) => void loadLocal(e.path)}
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
                        onGoUp={() =>
                            void loadRemote(parentRemotePath(remotePath))
                        }
                    />
                    <div className="min-h-0 flex-1 overflow-y-auto">
                        <FileList
                            entries={remoteEntries}
                            loading={remoteLoading}
                            selectedPath={selectedRemote?.path ?? null}
                            onSelect={setSelectedRemote}
                            onOpenDir={(e) => void loadRemote(e.path)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
