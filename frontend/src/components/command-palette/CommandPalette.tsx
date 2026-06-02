import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
    ArrowLeftRight,
    Columns2,
    FileCode2,
    FolderOpen,
    History,
    Key,
    Lock,
    PanelLeft,
    Plus,
    Server,
    Settings,
    Terminal,
    User,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
    Host,
    TabGroup,
} from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/search-input";
import { HostKeyTrustModal } from "@/components/terminal/HostKeyTrustModal";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { useConnectHost } from "@/hooks/useConnectHost";
import { useHostsWithoutBuiltin } from "@/hooks/useResolvedLocalhostHost";
import { useResolvedLocalhostHost } from "@/hooks/useResolvedLocalhostHost";
import { useKeys } from "@/hooks/useKeys";
import { useIdentities } from "@/hooks/useIdentities";
import { useAllHosts, useHosts } from "@/hooks/useHosts";
import { useOpenTabGroup } from "@/hooks/useOpenTabGroup";
import { useTabGroups } from "@/hooks/useTabGroups";
import { useSnippets } from "@/hooks/useSnippets";
import { useCommandHistorySearch } from "@/hooks/useCommandHistorySearch";
import { useSettings } from "@/hooks/useSettings";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import {
    formatTabGroupHostList,
    resolveTabGroupHosts,
} from "@/lib/tabGroups";
import { applySnippetContent, resolveSnippetTargetSessionIds } from "@/lib/snippetApply";
import {
    applyCommandToSessions,
    sessionHistoryHostId,
} from "@/lib/commandHistory";
import { useTerminalHistoryStore } from "@/store/terminalHistoryStore";
import { lockVaultFromUI } from "@/lib/vaultLock";
import { useSessionStore } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { normalizeHostTags } from "@/lib/hostSearch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type PaletteEntry = {
    id: string;
    sectionId: string;
    sectionLabel: string;
    label: string;
    description?: string;
    searchText: string;
    icon: ReactNode;
    disabled?: boolean;
    run: () => void;
};

function hostSortKey(host: Host): string {
    return (host.name || host.host).toLowerCase();
}

function tabGroupSortKey(group: TabGroup): string {
    return group.name.toLowerCase();
}

function matchesQuery(entry: PaletteEntry, query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return true;
    }
    return entry.searchText.includes(normalized);
}

function PaletteRow({
    entry,
    isSelected,
    onSelect,
    onHover,
}: {
    entry: PaletteEntry;
    isSelected: boolean;
    onSelect: () => void;
    onHover: () => void;
}) {
    return (
        <button
            type="button"
            role="option"
            aria-selected={isSelected}
            disabled={entry.disabled}
            onMouseEnter={onHover}
            onClick={onSelect}
            className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                entry.disabled && "cursor-not-allowed opacity-50",
                !entry.disabled &&
                    (isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/60"),
            )}
        >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
                {entry.icon}
            </span>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{entry.label}</div>
                {entry.description ? (
                    <div className="truncate text-xs text-muted-foreground">
                        {entry.description}
                    </div>
                ) : null}
            </div>
        </button>
    );
}

export function CommandPalette() {
    const { t } = useTranslation([
        "palette",
        "common",
        "hosts",
        "terminal",
        "tabgroups",
        "snippets",
        "keys",
        "forwards",
        "settings",
        "sftp",
        "commandHistory",
    ]);
    const isOpen = useUIStore((s) => s.isCommandPaletteOpen);
    const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);
    const setActiveView = useUIStore((s) => s.setActiveView);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);
    const openNewTabHostPicker = useUIStore((s) => s.openNewTabHostPicker);
    const commandBroadcastEnabled = useUIStore(
        (s) => s.commandBroadcastEnabled,
    );

    const { data: vaultHosts } = useHosts();
    const allHosts = useAllHosts();
    const { data: tabGroups } = useTabGroups();
    const { data: remoteHosts } = useHostsWithoutBuiltin();
    const { host: localhostHost } = useResolvedLocalhostHost();
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();
    const { data: snippets } = useSnippets();
    const { data: settings } = useSettings();
    const sessions = useSessionStore((s) => s.sessions);
    const activeSessionId = useSessionStore((s) => s.activeSessionId);
    const openTerminalHistory = useTerminalHistoryStore((s) => s.open);

    const {
        connect,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    } = useConnectHost(keys, identities, vaultHosts);
    const openTabGroup = useOpenTabGroup(keys, identities, allHosts);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const snippetTargetIds = useMemo(
        () =>
            resolveSnippetTargetSessionIds(
                sessions,
                activeSessionId,
                commandBroadcastEnabled,
            ),
        [activeSessionId, commandBroadcastEnabled, sessions],
    );
    const canInsertSnippet = snippetTargetIds.length > 0;
    const canRunHistory = snippetTargetIds.length > 0;

    const activeSession = sessions.find(
        (session) => session.id === activeSessionId,
    );
    const activeHostId = activeSession
        ? sessionHistoryHostId(activeSession)
        : "";

    const historyEnabled =
        isOpen &&
        settings?.commandHistoryEnabled !== false &&
        searchQuery.trim().length > 0;

    const { data: localHistory = [] } = useCommandHistorySearch(
        searchQuery,
        "local",
        activeHostId,
        historyEnabled && Boolean(activeHostId),
    );
    const { data: globalHistory = [] } = useCommandHistorySearch(
        searchQuery,
        "global",
        "",
        historyEnabled,
    );

    const connectableHosts = useMemo(() => {
        const hosts: Host[] = [];
        if (localhostHost) {
            hosts.push(localhostHost);
        }
        if (remoteHosts) {
            hosts.push(...remoteHosts);
        }
        return [...hosts].sort((a, b) =>
            hostSortKey(a).localeCompare(hostSortKey(b)),
        );
    }, [localhostHost, remoteHosts]);

    const close = useCallback(() => {
        closeCommandPalette();
    }, [closeCommandPalette]);

    const runAndClose = useCallback(
        (action: () => void) => {
            action();
            close();
        },
        [close],
    );

    const allEntries = useMemo(() => {
        const entries: PaletteEntry[] = [];
        const push = (
            entry: Omit<PaletteEntry, "searchText"> & { searchText?: string },
        ) => {
            const { searchText: customSearchText, ...rest } = entry;
            entries.push({
                ...rest,
                searchText:
                    customSearchText ??
                    `${entry.label} ${entry.description ?? ""} ${entry.sectionLabel}`.toLowerCase(),
            });
        };

        push({
            id: "action-new-tab",
            sectionId: "actions",
            sectionLabel: t("section_actions"),
            label: t("action_new_tab"),
            icon: <Plus className="size-4" />,
            run: () => openNewTabHostPicker(),
        });
        push({
            id: "action-toggle-sidebar",
            sectionId: "actions",
            sectionLabel: t("section_actions"),
            label: t("common:toggle_sidebar"),
            icon: <PanelLeft className="size-4" />,
            run: () => toggleSidebar(),
        });
        if (canRunHistory && settings?.commandHistoryEnabled !== false) {
            push({
                id: "action-command-history",
                sectionId: "actions",
                sectionLabel: t("section_actions"),
                label: t("commandHistory:open_bar"),
                icon: <History className="size-4" />,
                run: () => {
                    setActiveView(ViewType.Terminal);
                    openTerminalHistory("local");
                },
            });
        }
        push({
            id: "action-lock",
            sectionId: "actions",
            sectionLabel: t("section_actions"),
            label: t("action_lock_vault"),
            icon: <Lock className="size-4" />,
            run: () => {
                void lockVaultFromUI();
            },
        });

        const navViews: Array<{
            id: string;
            view: ViewType;
            label: string;
            icon: ReactNode;
        }> = [
            {
                id: "nav-hosts",
                view: ViewType.Hosts,
                label: t("hosts:page_title"),
                icon: <Server className="size-4" />,
            },
            {
                id: "nav-tab-groups",
                view: ViewType.TabGroups,
                label: t("tabgroups:page_title"),
                icon: <Columns2 className="size-4" />,
            },
            {
                id: "nav-keys",
                view: ViewType.Keys,
                label: t("keys:page_title"),
                icon: <Key className="size-4" />,
            },
            {
                id: "nav-identities",
                view: ViewType.Identities,
                label: t("identities:page_title"),
                icon: <User className="size-4" />,
            },
            {
                id: "nav-snippets",
                view: ViewType.Snippets,
                label: t("snippets:page_title"),
                icon: <FileCode2 className="size-4" />,
            },
            {
                id: "nav-forwards",
                view: ViewType.Forwards,
                label: t("forwards:page_title"),
                icon: <ArrowLeftRight className="size-4" />,
            },
            {
                id: "nav-sftp",
                view: ViewType.Sftp,
                label: t("sftp:page_title"),
                icon: <FolderOpen className="size-4" />,
            },
            {
                id: "nav-settings",
                view: ViewType.Settings,
                label: t("settings:page_title"),
                icon: <Settings className="size-4" />,
            },
        ];

        if (sessions.length > 0) {
            navViews.unshift({
                id: "nav-terminal",
                view: ViewType.Terminal,
                label: t("nav_terminal"),
                icon: <Terminal className="size-4" />,
            });
        }

        for (const item of navViews) {
            push({
                id: item.id,
                sectionId: "navigate",
                sectionLabel: t("section_navigate"),
                label: item.label,
                icon: item.icon,
                run: () => setActiveView(item.view),
            });
        }

        for (const host of connectableHosts) {
            const isLocal = isBuiltinLocalhostHost(host);
            const tagText = normalizeHostTags(host.tags).join(" ");
            const notesText = host.notes?.trim() ?? "";
            push({
                id: `host-${host.id}`,
                sectionId: "hosts",
                sectionLabel: t("section_hosts"),
                label: host.name || host.host,
                description: isLocal
                    ? t("hosts:reachability_local")
                    : `${host.username} · ${host.host}:${host.port || 22}`,
                searchText: [
                    host.name,
                    host.host,
                    host.username,
                    tagText,
                    notesText,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase(),
                icon: (
                    <HostIconBadge
                        icon={host.icon}
                        color={host.color}
                        size="sm"
                    />
                ),
                run: () => {
                    void connect(host);
                },
            });
        }

        const sortedGroups = [...(tabGroups ?? [])].sort((a, b) =>
            tabGroupSortKey(a).localeCompare(tabGroupSortKey(b)),
        );
        for (const group of sortedGroups) {
            const hosts = resolveTabGroupHosts(group, allHosts);
            push({
                id: `tab-group-${group.id}`,
                sectionId: "tab-groups",
                sectionLabel: t("section_tab_groups"),
                label: group.name,
                description:
                    hosts.length > 0
                        ? formatTabGroupHostList(hosts)
                        : t("tabgroups:no_hosts_available"),
                disabled: hosts.length === 0,
                icon: <Columns2 className="size-4" />,
                run: () => openTabGroup(group),
            });
        }

        for (const snippet of snippets ?? []) {
            push({
                id: `snippet-${snippet.id}`,
                sectionId: "snippets",
                sectionLabel: t("section_snippets"),
                label: snippet.name,
                description: snippet.content.split("\n")[0],
                disabled: !canInsertSnippet,
                icon: <FileCode2 className="size-4" />,
                run: () => {
                    void applySnippetContent(
                        snippetTargetIds,
                        snippet.content,
                    ).catch(() => {
                        toast.error(t("snippet_insert_failed"));
                    });
                },
            });
        }

        const seenHistory = new Set<string>();
        for (const entry of localHistory) {
            const key = `local:${entry.hostId}:${entry.command}`;
            if (seenHistory.has(key)) {
                continue;
            }
            seenHistory.add(key);
            push({
                id: `history-local-${entry.id}`,
                sectionId: "command-history-local",
                sectionLabel: t("commandHistory:section_local"),
                label: entry.command,
                description: entry.hostLabel || undefined,
                disabled: !canRunHistory,
                icon: <History className="size-4" />,
                run: () => {
                    void applyCommandToSessions(
                        snippetTargetIds,
                        entry.command,
                    );
                },
            });
        }

        for (const entry of globalHistory) {
            const key = `global:${entry.hostId}:${entry.command}`;
            if (seenHistory.has(key)) {
                continue;
            }
            seenHistory.add(key);
            push({
                id: `history-global-${entry.id}`,
                sectionId: "command-history-global",
                sectionLabel: t("commandHistory:section_global"),
                label: entry.command,
                description: entry.hostLabel || undefined,
                disabled: !canRunHistory,
                icon: <History className="size-4" />,
                run: () => {
                    void applyCommandToSessions(
                        snippetTargetIds,
                        entry.command,
                    );
                },
            });
        }

        return entries;
    }, [
        allHosts,
        canInsertSnippet,
        canRunHistory,
        connect,
        connectableHosts,
        globalHistory,
        localHistory,
        openNewTabHostPicker,
        openTabGroup,
        openTerminalHistory,
        setActiveView,
        settings?.commandHistoryEnabled,
        snippetTargetIds,
        snippets,
        sessions.length,
        t,
        tabGroups,
        toggleSidebar,
    ]);

    const filteredEntries = useMemo(
        () => allEntries.filter((entry) => matchesQuery(entry, searchQuery)),
        [allEntries, searchQuery],
    );

    const sections = useMemo(() => {
        const order = [
            "actions",
            "command-history-local",
            "command-history-global",
            "navigate",
            "hosts",
            "tab-groups",
            "snippets",
        ];
        const grouped = new Map<string, PaletteEntry[]>();
        for (const entry of filteredEntries) {
            const list = grouped.get(entry.sectionId) ?? [];
            list.push(entry);
            grouped.set(entry.sectionId, list);
        }
        return order
            .map((sectionId) => ({
                sectionId,
                label: grouped.get(sectionId)?.[0]?.sectionLabel ?? "",
                entries: grouped.get(sectionId) ?? [],
            }))
            .filter((section) => section.entries.length > 0);
    }, [filteredEntries]);

    const flatEntries = useMemo(
        () => sections.flatMap((section) => section.entries),
        [sections],
    );

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        setSearchQuery("");
        setSelectedIndex(0);
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex((index) =>
            flatEntries.length === 0
                ? 0
                : Math.min(index, flatEntries.length - 1),
        );
    }, [flatEntries.length, searchQuery]);

    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const frame = requestAnimationFrame(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
        });
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !listRef.current) {
            return;
        }
        const selected = listRef.current.querySelector('[aria-selected="true"]');
        selected?.scrollIntoView({ block: "nearest" });
    }, [isOpen, selectedIndex, flatEntries]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
        }
        if (flatEntries.length === 0) {
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => (i + 1) % flatEntries.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(
                (i) => (i - 1 + flatEntries.length) % flatEntries.length,
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            const entry = flatEntries[selectedIndex];
            if (entry && !entry.disabled) {
                runAndClose(entry.run);
            }
        }
    };

    let flatIndex = 0;

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
                <DialogContent
                    className="gap-0 overflow-hidden p-0 sm:max-w-lg"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onKeyDown={handleKeyDown}
                >
                    <DialogHeader className="gap-1 border-b border-border px-4 py-4">
                        <DialogTitle>{t("title")}</DialogTitle>
                        <DialogDescription>{t("description")}</DialogDescription>
                    </DialogHeader>

                    <div className="border-b border-border px-4 py-3">
                        <SearchInput
                            ref={searchRef}
                            wrapperClassName="w-full"
                            placeholder={t("search_placeholder")}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-autocomplete="list"
                            aria-controls="command-palette-list"
                        />
                    </div>

                    <div
                        ref={listRef}
                        id="command-palette-list"
                        role="listbox"
                        className="max-h-80 overflow-y-auto px-2 py-2"
                    >
                        {flatEntries.length === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                {t("no_results")}
                            </p>
                        ) : (
                            sections.map((section) => (
                                <div key={section.sectionId} className="mb-2">
                                    <div className="px-3 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                                        {section.label}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        {section.entries.map((entry) => {
                                            const itemIndex = flatIndex;
                                            flatIndex += 1;
                                            return (
                                                <PaletteRow
                                                    key={entry.id}
                                                    entry={entry}
                                                    isSelected={
                                                        itemIndex ===
                                                        selectedIndex
                                                    }
                                                    onSelect={() => {
                                                        if (!entry.disabled) {
                                                            runAndClose(
                                                                entry.run,
                                                            );
                                                        }
                                                    }}
                                                    onHover={() =>
                                                        setSelectedIndex(
                                                            itemIndex,
                                                        )
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <HostKeyTrustModal
                check={hostKeyCheck}
                onTrust={() => void trustHostKey()}
                onCancel={cancelHostKey}
            />
        </>
    );
}
