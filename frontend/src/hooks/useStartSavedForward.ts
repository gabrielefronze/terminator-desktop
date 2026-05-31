import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedForward } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { useConnectHost } from "@/hooks/useConnectHost";
import { parseAppError } from "@/lib/error";
import {
    findRemoteSessionForHost,
    startSavedForward,
    stopSavedForward,
    waitForRemoteSession,
} from "@/lib/savedForwardRuntime";
import { useSessionStore } from "@/store/sessionStore";
import type { SavedIdentity, SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";

export function useStartSavedForward(
    remoteHosts: Host[] | undefined,
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
    allHosts: Host[] | undefined,
) {
    const sessions = useSessionStore((state) => state.sessions);
    const {
        connect,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    } = useConnectHost(keys, identities, allHosts);
    const [startingId, setStartingId] = useState<string | null>(null);
    const [stoppingId, setStoppingId] = useState<string | null>(null);

    const startForward = useCallback(
        async (forward: SavedForward) => {
            setStartingId(forward.id);
            try {
                let session = findRemoteSessionForHost(sessions, forward.hostId);
                if (!session) {
                    const host = remoteHosts?.find((item) => item.id === forward.hostId);
                    if (!host) {
                        toast.error("Host not found");
                        return;
                    }
                    void connect(host);
                    session = await waitForRemoteSession(
                        forward.hostId,
                        () => useSessionStore.getState().sessions,
                    );
                }

                await startSavedForward(session.id, forward);
            } catch (error) {
                toast.error(parseAppError(error).message);
            } finally {
                setStartingId(null);
            }
        },
        [connect, remoteHosts, sessions],
    );

    const stopForward = useCallback(async (forwardId: string) => {
        setStoppingId(forwardId);
        try {
            await stopSavedForward(forwardId);
        } catch (error) {
            toast.error(parseAppError(error).message);
        } finally {
            setStoppingId(null);
        }
    }, []);

    return {
        startForward,
        stopForward,
        startingId,
        stoppingId,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    };
}
