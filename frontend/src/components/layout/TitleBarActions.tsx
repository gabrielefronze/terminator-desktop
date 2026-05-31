import { useEffect, useMemo, useState } from "react";
import { FileCode2, Radio } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { useSnippets } from "@/hooks/useSnippets";
import { getTileGroupSessionIds } from "@/lib/sessionTabs";
import {
    applySnippetContent,
    resolveSnippetTargetSessionIds,
} from "@/lib/snippetApply";
import { parseAppError } from "@/lib/error";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import { useUIStore } from "@/store/uiStore";

const titleBarActionButtonClass =
    "wails-no-drag flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

export function TitleBarActions() {
    const { t } = useTranslation("terminal");
    const { sessions, activeSessionId } = useSessionStore();
    const {
        commandBroadcastEnabled,
        toggleCommandBroadcast,
        setCommandBroadcastEnabled,
    } = useUIStore();
    const { data: snippets } = useSnippets();
    const [snippetPickerOpen, setSnippetPickerOpen] = useState(false);
    const [snippetQuery, setSnippetQuery] = useState("");

    const activeSession = sessions.find(
        (session) => session.id === activeSessionId,
    );
    const tileGroupSessionIds = activeSession
        ? getTileGroupSessionIds(activeSession, sessions)
        : [];
    const showBroadcast = tileGroupSessionIds.length > 1;
    const canApplySnippets = Boolean(
        activeSession &&
            resolveSnippetTargetSessionIds(
                sessions,
                activeSessionId,
                commandBroadcastEnabled,
            ).length > 0,
    );

    useEffect(() => {
        if (!showBroadcast && commandBroadcastEnabled) {
            setCommandBroadcastEnabled(false);
        }
    }, [commandBroadcastEnabled, setCommandBroadcastEnabled, showBroadcast]);

    const filteredSnippets = useMemo(() => {
        const query = snippetQuery.trim().toLowerCase();
        return snippets?.filter(
            (snippet) =>
                snippet.name.toLowerCase().includes(query) ||
                snippet.content.toLowerCase().includes(query),
        );
    }, [snippetQuery, snippets]);

    const runSnippet = async (content: string) => {
        const targetIds = resolveSnippetTargetSessionIds(
            sessions,
            activeSessionId,
            commandBroadcastEnabled,
        );
        if (targetIds.length === 0) {
            return;
        }

        try {
            await applySnippetContent(targetIds, content);
            setSnippetPickerOpen(false);
            setSnippetQuery("");
        } catch (error) {
            toast.error(parseAppError(error).message);
        }
    };

    return (
        <div className="flex shrink-0 items-center gap-1 px-2">
            {showBroadcast && (
                <button
                    type="button"
                    title={
                        commandBroadcastEnabled
                            ? t("broadcast_disable")
                            : t("broadcast_enable")
                    }
                    aria-label={
                        commandBroadcastEnabled
                            ? t("broadcast_disable")
                            : t("broadcast_enable")
                    }
                    aria-pressed={commandBroadcastEnabled}
                    className={cn(
                        titleBarActionButtonClass,
                        commandBroadcastEnabled &&
                            "border-primary/50 bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary",
                    )}
                    onClick={toggleCommandBroadcast}
                >
                    <Radio className="size-3.5" />
                </button>
            )}

            <Popover
                open={snippetPickerOpen}
                onOpenChange={(open) => {
                    setSnippetPickerOpen(open);
                    if (!open) {
                        setSnippetQuery("");
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        title={t("snippet_picker_title")}
                        aria-label={t("snippet_picker_title")}
                        disabled={!canApplySnippets}
                        className={titleBarActionButtonClass}
                    >
                        <FileCode2 className="size-3.5" />
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    side="bottom"
                    className="w-80 gap-0 p-0"
                >
                    <div className="border-b border-border p-2">
                        <SearchInput
                            wrapperClassName="w-full"
                            density="compact"
                            placeholder={t("snippet_picker_search_placeholder")}
                            value={snippetQuery}
                            onChange={(event) =>
                                setSnippetQuery(event.target.value)
                            }
                        />
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1">
                        {!filteredSnippets?.length && (
                            <p className="px-2 py-4 text-xs text-muted-foreground">
                                {t("snippets_empty")}
                            </p>
                        )}
                        {filteredSnippets?.map((snippet) => (
                            <button
                                key={snippet.id}
                                type="button"
                                className="flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
                                onClick={() => void runSnippet(snippet.content)}
                            >
                                <span className="font-medium">
                                    {snippet.name}
                                </span>
                                <span className="truncate font-mono text-xs text-muted-foreground">
                                    {snippet.content}
                                </span>
                            </button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
