import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Globe, Server, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCommandHistorySearch } from "@/hooks/useCommandHistorySearch";
import {
    applyCommandToSessions,
    sessionHistoryHostId,
    type CommandHistoryScope,
} from "@/lib/commandHistory";
import { resolveSnippetTargetSessionIds } from "@/lib/snippetApply";
import { useSessionStore } from "@/store/sessionStore";
import { useTerminalHistoryStore } from "@/store/terminalHistoryStore";
import { useUIStore } from "@/store/uiStore";

interface TerminalCommandHistoryBarProps {
    sessionId: string;
}

export function TerminalCommandHistoryBar({
    sessionId,
}: TerminalCommandHistoryBarProps) {
    const { t } = useTranslation(["commandHistory", "common"]);
    const isOpen = useTerminalHistoryStore((s) => s.isOpen);
    const query = useTerminalHistoryStore((s) => s.query);
    const scope = useTerminalHistoryStore((s) => s.scope);
    const setQuery = useTerminalHistoryStore((s) => s.setQuery);
    const setScope = useTerminalHistoryStore((s) => s.setScope);
    const close = useTerminalHistoryStore((s) => s.close);

    const sessions = useSessionStore((s) => s.sessions);
    const activeSessionId = useSessionStore((s) => s.activeSessionId);
    const commandBroadcastEnabled = useUIStore((s) => s.commandBroadcastEnabled);

    const session = sessions.find((item) => item.id === sessionId);
    const hostId = session ? sessionHistoryHostId(session) : "";

    const { data: entries = [], isFetching } = useCommandHistorySearch(
        query,
        scope,
        hostId,
        isOpen && Boolean(hostId),
    );

    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const targetSessionIds = resolveSnippetTargetSessionIds(
        sessions,
        activeSessionId,
        commandBroadcastEnabled,
    );

    const runCommand = useCallback(
        async (command: string) => {
            await applyCommandToSessions(targetSessionIds, command);
            close();
        },
        [close, targetSessionIds],
    );

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const frame = requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query, scope, entries.length]);

    if (!isOpen || activeSessionId !== sessionId) {
        return null;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
        }
        if (entries.length === 0) {
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => (i + 1) % entries.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((i) => (i - 1 + entries.length) % entries.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const entry = entries[selectedIndex];
            if (entry) {
                void runCommand(entry.command);
            }
        }
    };

    const scopeButton = (value: CommandHistoryScope, label: string, icon: ReactNode) => (
        <Button
            type="button"
            size="sm"
            variant={scope === value ? "secondary" : "ghost"}
            className="h-7 px-2 text-xs"
            onClick={() => setScope(value)}
        >
            {icon}
            <span className="ml-1">{label}</span>
        </Button>
    );

    return (
        <div className="absolute left-3 right-3 top-3 z-30 flex max-h-[min(320px,50vh)] flex-col overflow-hidden rounded-lg border border-border bg-card/95 shadow-lg backdrop-blur-sm">
            <div className="flex shrink-0 items-center gap-1 border-b border-border p-1">
                <Input
                    ref={inputRef}
                    data-terminal-history-input="true"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("search_placeholder")}
                    className="h-8 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                    aria-label={t("search_placeholder")}
                />
                {scopeButton(
                    "local",
                    t("scope_local"),
                    <Server className="size-3.5" />,
                )}
                {scopeButton(
                    "global",
                    t("scope_global"),
                    <Globe className="size-3.5" />,
                )}
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={close}
                    aria-label={t("close", { ns: "common" })}
                >
                    <X className="size-4" />
                </Button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-1" role="listbox">
                {isFetching && entries.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-muted-foreground">
                        {t("loading")}
                    </li>
                ) : null}
                {!isFetching && entries.length === 0 ? (
                    <li className="px-3 py-2 text-xs text-muted-foreground">
                        {t("empty")}
                    </li>
                ) : null}
                {entries.map((entry, index) => (
                    <li key={entry.id} role="option" aria-selected={index === selectedIndex}>
                        <button
                            type="button"
                            className={cn(
                                "flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
                                index === selectedIndex && "bg-accent text-accent-foreground",
                            )}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onClick={() => void runCommand(entry.command)}
                        >
                            <span className="truncate font-mono">{entry.command}</span>
                            {scope === "global" && entry.hostLabel ? (
                                <span className="truncate text-xs text-muted-foreground">
                                    {entry.hostLabel}
                                </span>
                            ) : null}
                        </button>
                    </li>
                ))}
            </ul>
            <div className="flex shrink-0 items-center justify-center border-t border-border px-2 py-1 text-[10px] text-muted-foreground">
                <ChevronDown className="mr-1 size-3 rotate-180" />
                {t("hint")}
            </div>
        </div>
    );
}
