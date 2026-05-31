import { useCallback } from "react";
import { Host, TabGroup } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { buildSessionFromHost } from "@/lib/connectHost";
import { resolveTabGroupHosts } from "@/lib/tabGroups";
import { useSessionStore } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { toast } from "sonner";

export function useOpenTabGroup(
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
    allHosts: Host[] | undefined,
) {
    const addSession = useSessionStore((state) => state.addSession);
    const linkSplitSessions = useSessionStore((state) => state.linkSplitSessions);
    const assignTabGroupId = useSessionStore((state) => state.assignTabGroupId);
    const setActiveSession = useSessionStore((state) => state.setActiveSession);

    return useCallback(
        (tabGroup: TabGroup) => {
            if (!allHosts) return;

            const hosts = resolveTabGroupHosts(tabGroup, allHosts);
            if (hosts.length === 0) {
                toast.error("No hosts in this tab group are available");
                return;
            }

            const sessionIds: string[] = [];
            for (const host of hosts) {
                const sessionId = addSession(
                    buildSessionFromHost(host, keys, identities, allHosts),
                    { switchToTerminal: false },
                );
                sessionIds.push(sessionId);
            }

            if (sessionIds.length >= 2) {
                linkSplitSessions(sessionIds[1], sessionIds[0]);
            }

            assignTabGroupId(sessionIds, tabGroup.id);
            setActiveSession(sessionIds[0]);
            useUIStore.getState().setActiveView(ViewType.Terminal);
        },
        [
            addSession,
            allHosts,
            assignTabGroupId,
            identities,
            keys,
            linkSplitSessions,
            setActiveSession,
        ],
    );
}
