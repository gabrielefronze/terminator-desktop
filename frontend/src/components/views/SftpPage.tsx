import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { HostKeyTrustModal } from "@/components/terminal/HostKeyTrustModal";
import { SftpDualPane } from "@/components/sftp/SftpDualPane";
import { useHostsWithoutBuiltin } from "@/hooks/useResolvedLocalhostHost";
import { useHosts } from "@/hooks/useHosts";
import { useKeys } from "@/hooks/useKeys";
import { useIdentities } from "@/hooks/useIdentities";
import { useConnectHost } from "@/hooks/useConnectHost";
import { useBackgroundSshSession } from "@/hooks/useBackgroundSshSession";
import { SSHConnectionConfig } from "../../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { Host } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { HostIconBadge } from "@/components/views/HostIconBadge";

export function SftpPage() {
    const { t } = useTranslation(["sftp", "hosts", "common"]);
    const { data: hosts } = useHostsWithoutBuiltin();
    const { data: allHosts } = useHosts();
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();

    const {
        connectSftp,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    } = useConnectHost(keys, identities, allHosts);

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedHostId, setSelectedHostId] = useState<string>("");
    const [sshConfig, setSshConfig] = useState<SSHConnectionConfig | null>(null);
    const [connectingHostId, setConnectingHostId] = useState<string | null>(
        null,
    );

    const { ready, error } = useBackgroundSshSession(sshConfig);

    const filteredHosts = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return hosts?.filter(
            (h) =>
                (h.name || h.host).toLowerCase().includes(q) ||
                h.host.toLowerCase().includes(q),
        );
    }, [hosts, searchQuery]);

    const selectedHost = hosts?.find((h) => h.id === selectedHostId);

    const handleSelectHost = useCallback(
        (host: Host) => {
            setSelectedHostId(host.id);
            setSshConfig(null);
            setConnectingHostId(host.id);
            connectSftp(host, (config) => {
                setSshConfig(config);
                setConnectingHostId(null);
            });
        },
        [connectSftp],
    );

    const handleDisconnect = () => {
        setSshConfig(null);
        setSelectedHostId("");
        setConnectingHostId(null);
    };

    return (
        <div className="flex h-full min-h-0 w-full flex-col">
            <div className="shrink-0 border-b border-border p-6 pb-4">
                <h1 className="mb-1 text-2xl font-bold tracking-tight">
                    {t("page_title")}
                </h1>
                <p className="mb-4 text-sm text-muted-foreground">
                    {t("page_description")}
                </p>

                <div className="flex flex-wrap items-end gap-4">
                    <div className="min-w-[220px] flex-1">
                        <Label className="mb-2 block text-xs">
                            {t("select_host")}
                        </Label>
                        <Select
                            value={selectedHostId || undefined}
                            onValueChange={(id) => {
                                const host = hosts?.find((h) => h.id === id);
                                if (host) handleSelectHost(host);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={t("select_host_placeholder")}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {filteredHosts?.map((host) => (
                                    <SelectItem key={host.id} value={host.id}>
                                        {host.name || host.host} ({host.host})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {sshConfig && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDisconnect}
                        >
                            {t("disconnect")}
                        </Button>
                    )}
                </div>

                {error && (
                    <p className="mt-3 text-sm text-destructive">{error}</p>
                )}
                {connectingHostId && !error && (
                    <p className="mt-3 text-sm text-muted-foreground">
                        {t("connecting")}
                    </p>
                )}
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <aside className="w-56 shrink-0 overflow-y-auto border-r border-border p-3">
                    <SearchInput
                        density="compact"
                        wrapperClassName="mb-3"
                        placeholder={t("search_hosts", { ns: "hosts" })}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <ul className="space-y-1">
                        {filteredHosts?.map((host) => (
                            <li key={host.id}>
                                <button
                                    type="button"
                                    className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors ${
                                        selectedHostId === host.id
                                            ? "bg-primary/15 text-foreground"
                                            : "hover:bg-muted"
                                    }`}
                                    onClick={() => handleSelectHost(host)}
                                >
                                    <HostIconBadge
                                        icon={host.icon}
                                        color={host.color}
                                        size="sm"
                                    />
                                    <span className="min-w-0 truncate">
                                        {host.name || host.host}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </aside>

                <div className="min-h-0 min-w-0 flex-1">
                    {!selectedHostId && (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                            <FolderOpen className="size-10 opacity-40" />
                            <p className="text-sm">{t("empty_state")}</p>
                        </div>
                    )}
                    {selectedHostId && sshConfig && ready && (
                        <SftpDualPane
                            sessionId={sshConfig.id}
                            remoteLabel={
                                selectedHost?.name || selectedHost?.host || ""
                            }
                        />
                    )}
                    {selectedHostId && sshConfig && !ready && !error && (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            {t("sftp_loading", { ns: "terminal" })}
                        </div>
                    )}
                </div>
            </div>

            <HostKeyTrustModal
                check={hostKeyCheck}
                onTrust={() => void trustHostKey()}
                onCancel={cancelHostKey}
            />
        </div>
    );
}
