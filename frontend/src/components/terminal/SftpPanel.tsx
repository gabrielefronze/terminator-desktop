import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, Folder, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SshService } from "../../../bindings/terminator-desktop/backend/internal/services/ssh";
import type { SftpEntry } from "../../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { parseAppError } from "@/lib/error";
import { toast } from "sonner";

interface SftpPanelProps {
    sessionId: string;
    disabled?: boolean;
    fullPage?: boolean;
    hostLabel?: string;
}

export function SftpPanel({
    sessionId,
    disabled,
    fullPage,
    hostLabel,
}: SftpPanelProps) {
    const { t } = useTranslation("terminal");
    const [path, setPath] = useState(".");
    const [entries, setEntries] = useState<SftpEntry[]>([]);
    const [loading, setLoading] = useState(false);

    const loadPath = async (remotePath: string) => {
        if (disabled) return;
        setLoading(true);
        try {
            const list = await SshService.SftpList(sessionId, remotePath);
            setPath(remotePath);
            setEntries(list ?? []);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadPath(".");
    }, [sessionId, disabled]);

    const parentPath = () => {
        if (path === "." || path === "/") return "/";
        const parts = path.replace(/\\/g, "/").split("/").filter(Boolean);
        parts.pop();
        return parts.length === 0 ? "/" : `/${parts.join("/")}`;
    };

    return (
        <div
            className={`flex h-full flex-col bg-card ${
                fullPage ? "" : "border-l border-border"
            }`}
        >
            {hostLabel && (
                <div className="border-b border-border px-3 py-2 text-sm font-medium">
                    {hostLabel}
                </div>
            )}
            <div className="flex items-center gap-1 border-b border-border px-2 py-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={disabled || loading || path === "."}
                    onClick={() => void loadPath(parentPath())}
                >
                    <ChevronUp className="h-4 w-4" />
                </Button>
                <span className="truncate font-mono text-xs">{path}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-1">
                {loading && (
                    <p className="px-2 py-2 text-xs text-muted-foreground">
                        {t("sftp_loading")}
                    </p>
                )}
                {entries.map((entry) => (
                    <button
                        key={entry.path}
                        type="button"
                        disabled={disabled || loading || !entry.isDir}
                        className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted disabled:opacity-50"
                        onClick={() => entry.isDir && void loadPath(entry.path)}
                    >
                        {entry.isDir ? (
                            <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="truncate">{entry.name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
