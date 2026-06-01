import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
    ArrowDownToLine,
    ArrowUpToLine,
    File,
    FilePen,
    Folder,
    FolderOpen,
    FolderPlus,
    Pencil,
    Shield,
    Trash2,
} from "lucide-react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { type FileEntry, formatFileSize } from "@/lib/fileEntry";

export type SftpPaneSide = "local" | "remote";

interface SftpFileListProps {
    side: SftpPaneSide;
    entries: FileEntry[];
    loading: boolean;
    selectedPath: string | null;
    busy?: boolean;
    onSelect: (entry: FileEntry) => void;
    onOpenDir: (entry: FileEntry) => void;
    onUpload?: (entry: FileEntry) => void;
    onDownload?: (entry: FileEntry) => void;
    onRename?: (entry: FileEntry) => void;
    onDelete?: (entry: FileEntry) => void;
    onChmod?: (entry: FileEntry) => void;
    onEdit?: (entry: FileEntry) => void;
    onMkdir?: () => void;
}

function FileRow({
    entry,
    selectedPath,
    onSelect,
    onOpenDir,
    menu,
}: {
    entry: FileEntry;
    selectedPath: string | null;
    onSelect: (entry: FileEntry) => void;
    onOpenDir: (entry: FileEntry) => void;
    menu: ReactNode;
}) {
    return (
        <li key={entry.path}>
            <ContextMenu
                onOpenChange={(open) => {
                    if (open) {
                        onSelect(entry);
                    }
                }}
            >
                <ContextMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                            selectedPath === entry.path &&
                                "bg-primary/15 ring-1 ring-primary/30",
                        )}
                        onClick={() => onSelect(entry)}
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
                        <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                        {!entry.isDir && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {formatFileSize(entry.size)}
                            </span>
                        )}
                    </button>
                </ContextMenuTrigger>
                {menu}
            </ContextMenu>
        </li>
    );
}

export function SftpFileList({
    side,
    entries,
    loading,
    selectedPath,
    busy = false,
    onSelect,
    onOpenDir,
    onUpload,
    onDownload,
    onRename,
    onDelete,
    onChmod,
    onEdit,
    onMkdir,
}: SftpFileListProps) {
    const { t } = useTranslation("sftp");

    const renderLocalMenu = (entry: FileEntry) => (
        <ContextMenuContent>
            {entry.isDir && (
                <ContextMenuItem onClick={() => onOpenDir(entry)}>
                    <FolderOpen className="mr-2 size-4" />
                    {t("open")}
                </ContextMenuItem>
            )}
            {!entry.isDir && onUpload && (
                <ContextMenuItem
                    disabled={busy}
                    onClick={() => onUpload(entry)}
                >
                    <ArrowUpToLine className="mr-2 size-4" />
                    {t("upload")}
                </ContextMenuItem>
            )}
        </ContextMenuContent>
    );

    const renderRemoteMenu = (entry: FileEntry) => (
        <ContextMenuContent>
            {entry.isDir && (
                <ContextMenuItem onClick={() => onOpenDir(entry)}>
                    <FolderOpen className="mr-2 size-4" />
                    {t("open")}
                </ContextMenuItem>
            )}
            {!entry.isDir && onDownload && (
                <ContextMenuItem
                    disabled={busy}
                    onClick={() => onDownload(entry)}
                >
                    <ArrowDownToLine className="mr-2 size-4" />
                    {t("download")}
                </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            {onRename && (
                <ContextMenuItem disabled={busy} onClick={() => onRename(entry)}>
                    <Pencil className="mr-2 size-4" />
                    {t("rename")}
                </ContextMenuItem>
            )}
            {onChmod && (
                <ContextMenuItem disabled={busy} onClick={() => onChmod(entry)}>
                    <Shield className="mr-2 size-4" />
                    {t("chmod")}
                </ContextMenuItem>
            )}
            {!entry.isDir && onEdit && (
                <ContextMenuItem disabled={busy} onClick={() => onEdit(entry)}>
                    <FilePen className="mr-2 size-4" />
                    {t("edit_remote")}
                </ContextMenuItem>
            )}
            <ContextMenuSeparator />
            {onDelete && (
                <ContextMenuItem
                    variant="destructive"
                    disabled={busy}
                    onClick={() => onDelete(entry)}
                >
                    <Trash2 className="mr-2 size-4" />
                    {t("delete")}
                </ContextMenuItem>
            )}
        </ContextMenuContent>
    );

    if (loading) {
        return (
            <p className="px-3 py-4 text-xs text-muted-foreground">{t("loading")}</p>
        );
    }

    const listBody =
        entries.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground">{t("empty_dir")}</p>
        ) : (
            <ul className="p-1">
                {entries.map((entry) => (
                    <FileRow
                        key={entry.path}
                        entry={entry}
                        selectedPath={selectedPath}
                        onSelect={onSelect}
                        onOpenDir={onOpenDir}
                        menu={
                            side === "local"
                                ? renderLocalMenu(entry)
                                : renderRemoteMenu(entry)
                        }
                    />
                ))}
            </ul>
        );

    if (side === "remote" && onMkdir) {
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className="min-h-full">{listBody}</div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem disabled={busy} onClick={() => onMkdir()}>
                        <FolderPlus className="mr-2 size-4" />
                        {t("mkdir")}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    }

    return listBody;
}
