import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Columns2, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { HostKeyTrustModal } from "@/components/terminal/HostKeyTrustModal";
import { useConnectHost } from "@/hooks/useConnectHost";
import { useHostsWithoutBuiltin } from "@/hooks/useResolvedLocalhostHost";
import { useResolvedLocalhostHost } from "@/hooks/useResolvedLocalhostHost";
import { useKeys } from "@/hooks/useKeys";
import { useIdentities } from "@/hooks/useIdentities";
import { useAllHosts, useHosts } from "@/hooks/useHosts";
import { useOpenTabGroup } from "@/hooks/useOpenTabGroup";
import { useTabGroups } from "@/hooks/useTabGroups";
import { filterHosts } from "@/lib/hostTree";
import { normalizeGroupColor } from "@/lib/hostAppearance";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import {
    formatTabGroupHostList,
    resolveTabGroupHosts,
} from "@/lib/tabGroups";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

function hostSortKey(host: Host): string {
    return (host.name || host.host).toLowerCase();
}

function tabGroupSortKey(group: TabGroup): string {
    return group.name.toLowerCase();
}

function filterTabGroups(
    tabGroups: TabGroup[],
    query: string,
    allHosts: Host[],
): TabGroup[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tabGroups;

    return tabGroups.filter((group) => {
        if (group.name.toLowerCase().includes(normalized)) return true;
        return resolveTabGroupHosts(group, allHosts).some((host) =>
            (host.name || host.host).toLowerCase().includes(normalized),
        );
    });
}

function TabGroupPickerRow({
    group,
    hosts,
    isSelected,
    onSelect,
    onHover,
}: {
    group: TabGroup;
    hosts: Host[];
    isSelected: boolean;
    onSelect: (group: TabGroup) => void;
    onHover: () => void;
}) {
    const { t } = useTranslation("tabgroups");
    const groupColor = normalizeGroupColor(group.color);

    return (
        <button
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseEnter={onHover}
            onClick={() => onSelect(group)}
            className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60",
            )}
            style={{ borderColor: groupColor }}
        >
            <HostIconBadge icon={group.icon} color={group.color} size="sm" />
            <Columns2
                className="size-3 shrink-0"
                style={{ color: groupColor }}
                aria-hidden
            />
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{group.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                    {hosts.length > 0
                        ? formatTabGroupHostList(hosts)
                        : t("no_hosts_available")}
                </div>
            </div>
        </button>
    );
}

function HostPickerRow({
    host,
    isSelected,
    onSelect,
    onHover,
}: {
    host: Host;
    isSelected: boolean;
    onSelect: (host: Host) => void;
    onHover: () => void;
}) {
    const { t } = useTranslation(["terminal", "hosts"]);
    const isLocal = isBuiltinLocalhostHost(host);

    return (
        <button
            type="button"
            role="option"
            aria-selected={isSelected}
            onMouseEnter={onHover}
            onClick={() => onSelect(host)}
            className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                isSelected
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted/60",
            )}
        >
            <HostIconBadge icon={host.icon} color={host.color} size="sm" />
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                    {host.name || host.host}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                    {isLocal
                        ? t("hosts:reachability_local")
                        : `${host.username} · ${host.host}:${host.port || 22}`}
                </div>
            </div>
        </button>
    );
}

export function NewTabHostPickerModal() {
    const { t } = useTranslation(["terminal", "hosts", "common", "tabgroups"]);
    const isOpen = useUIStore((s) => s.isNewTabHostPickerOpen);
    const closeNewTabHostPicker = useUIStore((s) => s.closeNewTabHostPicker);
    const { data: vaultHosts } = useHosts();
    const allHosts = useAllHosts();
    const { data: tabGroups } = useTabGroups();
    const { data: remoteHosts } = useHostsWithoutBuiltin();
    const { host: localhostHost } = useResolvedLocalhostHost();
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();
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

    const filteredHosts = useMemo(
        () => filterHosts(connectableHosts, searchQuery),
        [connectableHosts, searchQuery],
    );

    const filteredTabGroups = useMemo(() => {
        const sorted = [...(tabGroups ?? [])].sort((a, b) =>
            tabGroupSortKey(a).localeCompare(tabGroupSortKey(b)),
        );
        return filterTabGroups(sorted, searchQuery, allHosts);
    }, [allHosts, searchQuery, tabGroups]);

    const pickerItemCount = filteredTabGroups.length + filteredHosts.length;
    const hasConfiguredTargets =
        connectableHosts.length > 0 || (tabGroups?.length ?? 0) > 0;

    useEffect(() => {
        if (!isOpen) return;
        setSearchQuery("");
        setSelectedIndex(0);
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex((index) =>
            pickerItemCount === 0
                ? 0
                : Math.min(index, pickerItemCount - 1),
        );
    }, [pickerItemCount, searchQuery]);

    useEffect(() => {
        if (!isOpen) return;
        const frame = requestAnimationFrame(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
        });
        return () => cancelAnimationFrame(frame);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !listRef.current) return;
        const selected = listRef.current.querySelector(
            '[aria-selected="true"]',
        );
        selected?.scrollIntoView({ block: "nearest" });
    }, [isOpen, selectedIndex, filteredHosts, filteredTabGroups]);

    const handleSelectHost = useCallback(
        (host: Host) => {
            void connect(host);
            closeNewTabHostPicker();
        },
        [connect, closeNewTabHostPicker],
    );

    const handleSelectTabGroup = useCallback(
        (group: TabGroup) => {
            openTabGroup(group);
            closeNewTabHostPicker();
        },
        [closeNewTabHostPicker, openTabGroup],
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (pickerItemCount === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => (i + 1) % pickerItemCount);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(
                (i) => (i - 1 + pickerItemCount) % pickerItemCount,
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex < filteredTabGroups.length) {
                const group = filteredTabGroups[selectedIndex];
                if (group) handleSelectTabGroup(group);
                return;
            }
            const host =
                filteredHosts[selectedIndex - filteredTabGroups.length];
            if (host) handleSelectHost(host);
        }
    };

    return (
        <>
            <Dialog
                open={isOpen}
                onOpenChange={(open) => !open && closeNewTabHostPicker()}
            >
                <DialogContent
                    className="gap-0 overflow-hidden p-0 sm:max-w-md"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onKeyDown={handleKeyDown}
                >
                    <DialogHeader className="gap-1 border-b border-border px-4 py-4">
                        <DialogTitle>{t("new_tab_title")}</DialogTitle>
                        <DialogDescription>
                            {t("new_tab_description")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="border-b border-border px-4 py-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                ref={searchRef}
                                placeholder={t("new_tab_search_placeholder")}
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                aria-autocomplete="list"
                                aria-controls="new-tab-host-list"
                            />
                        </div>
                    </div>

                    <div
                        ref={listRef}
                        id="new-tab-host-list"
                        role="listbox"
                        className="max-h-72 overflow-y-auto px-2 py-2"
                    >
                        {pickerItemCount === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                {!hasConfiguredTargets
                                    ? t("new_tab_no_hosts")
                                    : t("hosts:no_search_results")}
                            </p>
                        ) : (
                            <>
                                {filteredTabGroups.length > 0 && (
                                    <>
                                        <div className="px-3 pb-1 pt-1.5 text-xs font-medium text-muted-foreground">
                                            {t("tabgroups:picker_section")}
                                        </div>
                                        <div className="flex flex-col gap-2.5 px-1 pb-3">
                                            {filteredTabGroups.map(
                                                (group, index) => (
                                                    <TabGroupPickerRow
                                                        key={group.id}
                                                        group={group}
                                                        hosts={resolveTabGroupHosts(
                                                            group,
                                                            allHosts,
                                                        )}
                                                        isSelected={
                                                            index ===
                                                            selectedIndex
                                                        }
                                                        onSelect={
                                                            handleSelectTabGroup
                                                        }
                                                        onHover={() =>
                                                            setSelectedIndex(
                                                                index,
                                                            )
                                                        }
                                                    />
                                                ),
                                            )}
                                        </div>
                                    </>
                                )}
                                {filteredHosts.length > 0 && (
                                    <>
                                        {filteredTabGroups.length > 0 && (
                                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
                                                {t("new_tab_section_hosts")}
                                            </div>
                                        )}
                                        {filteredHosts.map((host, index) => {
                                            const itemIndex =
                                                filteredTabGroups.length +
                                                index;
                                            return (
                                                <HostPickerRow
                                                    key={host.id}
                                                    host={host}
                                                    isSelected={
                                                        itemIndex ===
                                                        selectedIndex
                                                    }
                                                    onSelect={handleSelectHost}
                                                    onHover={() =>
                                                        setSelectedIndex(
                                                            itemIndex,
                                                        )
                                                    }
                                                />
                                            );
                                        })}
                                    </>
                                )}
                            </>
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
