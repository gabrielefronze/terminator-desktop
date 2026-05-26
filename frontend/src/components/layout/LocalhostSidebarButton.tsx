import { useState } from "react";
import { Edit, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { HostModal } from "@/components/views/HostModal";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useResolvedLocalhostHost } from "@/hooks/useResolvedLocalhostHost";
import { useHostGroups } from "@/hooks/useHostGroups";
import { useSaveHost } from "@/hooks/useHosts";
import { useSessionStore } from "@/store/sessionStore";
import { buildSessionFromHost } from "@/lib/connectHost";
import { Host } from "../../../bindings/terminator-desktop/backend/internal/services/blob";

export function LocalhostSidebarButton() {
    const { t } = useTranslation(["hosts", "common"]);
    const { host } = useResolvedLocalhostHost();
    const { data: groups } = useHostGroups();
    const { addSession } = useSessionStore();
    const saveHostMutation = useSaveHost();
    const [isEditOpen, setIsEditOpen] = useState(false);

    if (!host) return null;

    const connect = () => {
        addSession(buildSessionFromHost(host, undefined, undefined));
    };

    const handleSave = (updated: Host) => {
        saveHostMutation.mutate(
            new Host({
                ...updated,
                id: host.id,
                groupId: undefined,
            }),
            { onSuccess: () => setIsEditOpen(false) },
        );
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={connect}
                        className="wails-no-drag"
                        title={host.name || "Local"}
                    >
                        <HostIconBadge
                            icon={host.icon}
                            color={host.color}
                            size="sm"
                            className="size-8 rounded-lg"
                            iconClassName="size-4"
                        />
                    </Button>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-40">
                    <ContextMenuItem onClick={connect}>
                        <Terminal className="mr-2 size-4" />
                        {t("connect", { ns: "common", defaultValue: "Connect" })}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setIsEditOpen(true)}>
                        <Edit className="mr-2 size-4" />
                        {t("edit", { ns: "common" })}
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>

            <HostModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSave={handleSave}
                initialData={host}
                groups={groups ?? []}
                isSaving={saveHostMutation.isPending}
                localShellOnly
            />
        </>
    );
}
