import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Host } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
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
import { useHosts } from "@/hooks/useHosts";
import { filterHosts } from "@/lib/hostTree";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

function hostSortKey(host: Host): string {
    return (host.name || host.host).toLowerCase();
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
    const { t } = useTranslation(["terminal", "hosts", "common"]);
    const isOpen = useUIStore((s) => s.isNewTabHostPickerOpen);
    const closeNewTabHostPicker = useUIStore((s) => s.closeNewTabHostPicker);
    const { data: allHosts } = useHosts();
    const { data: remoteHosts } = useHostsWithoutBuiltin();
    const { host: localhostHost } = useResolvedLocalhostHost();
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();
    const {
        connect,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    } = useConnectHost(keys, identities, allHosts);

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

    useEffect(() => {
        if (!isOpen) return;
        setSearchQuery("");
        setSelectedIndex(0);
    }, [isOpen]);

    useEffect(() => {
        setSelectedIndex((index) =>
            filteredHosts.length === 0
                ? 0
                : Math.min(index, filteredHosts.length - 1),
        );
    }, [filteredHosts.length, searchQuery]);

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
    }, [isOpen, selectedIndex, filteredHosts]);

    const handleSelect = useCallback(
        (host: Host) => {
            void connect(host);
            closeNewTabHostPicker();
        },
        [connect, closeNewTabHostPicker],
    );

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (filteredHosts.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((i) => (i + 1) % filteredHosts.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex(
                (i) => (i - 1 + filteredHosts.length) % filteredHosts.length,
            );
        } else if (e.key === "Enter") {
            e.preventDefault();
            const host = filteredHosts[selectedIndex];
            if (host) handleSelect(host);
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
                                placeholder={t("hosts:search_hosts")}
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
                        {filteredHosts.length === 0 ? (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                {connectableHosts.length === 0
                                    ? t("new_tab_no_hosts")
                                    : t("hosts:no_search_results")}
                            </p>
                        ) : (
                            filteredHosts.map((host, index) => (
                                <HostPickerRow
                                    key={host.id}
                                    host={host}
                                    isSelected={index === selectedIndex}
                                    onSelect={handleSelect}
                                    onHover={() => setSelectedIndex(index)}
                                />
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
