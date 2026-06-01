import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { useSettings } from "@/hooks/useSettings";
import { HOSTS_QUERY_KEY } from "@/hooks/useHosts";
import { KEYS_QUERY_KEY } from "@/hooks/useKeys";
import { IDENTITIES_QUERY_KEY } from "@/hooks/useIdentities";
import { buildSessionFromHost } from "@/lib/connectHost";
import {
    buildSessionRestoreSnapshot,
    savedTileNodeFromTab,
} from "@/lib/sessionRestore";
import { deserializeTileLayout } from "@/lib/tabGroupLayout";
import { getTitleBarSessions, getTileGroupSessionIds } from "@/lib/sessionTabs";
import { sessionHostId } from "@/lib/tabGroups";
import { Service as SessionRestoreService } from "../../bindings/terminator-desktop/backend/internal/services/sessionrestore";
import type { Snapshot } from "../../bindings/terminator-desktop/backend/internal/services/sessionrestore";
import type { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import type { SavedIdentity, SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { parseAppError } from "@/lib/error";

const SAVE_DEBOUNCE_MS = 800;

export function useSessionRestorePersistence() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const { data: settings } = useSettings();
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const persistNow = useCallback(async () => {
        if (settings?.sessionRestoreEnabled === false) {
            return;
        }

        const { sessions, activeSessionId } = useSessionStore.getState();
        const leaders = getTitleBarSessions(sessions);
        if (leaders.length === 0) {
            try {
                await SessionRestoreService.ClearSnapshot();
            } catch {
                // ignore
            }
            return;
        }

        const snapshot = buildSessionRestoreSnapshot(sessions, activeSessionId);
        try {
            await SessionRestoreService.SaveSnapshot(snapshot);
        } catch (error) {
            console.error("session restore save failed", error);
        }
    }, [settings?.sessionRestoreEnabled]);

    useEffect(() => {
        if (!isUnlocked || settings?.sessionRestoreEnabled === false) {
            return;
        }

        const unsubscribe = useSessionStore.subscribe((state, prev) => {
            if (
                state.sessions === prev.sessions &&
                state.activeSessionId === prev.activeSessionId
            ) {
                return;
            }

            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = setTimeout(() => {
                saveTimerRef.current = null;
                void persistNow();
            }, SAVE_DEBOUNCE_MS);
        });

        return () => {
            unsubscribe();
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, [isUnlocked, persistNow, settings?.sessionRestoreEnabled]);

    useEffect(() => {
        const onBeforeUnload = () => {
            void persistNow();
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [persistNow]);
}

export function useSessionRestoreOffer() {
    const { t } = useTranslation("sessionRestore");
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const { data: settings } = useSettings();
    const queryClient = useQueryClient();
    const [promptOpen, setPromptOpen] = useState(false);
    const [pendingSnapshot, setPendingSnapshot] = useState<Snapshot | null>(null);
    const [restoring, setRestoring] = useState(false);
    const offeredRef = useRef(false);

    const {
        addSession,
        assignTileGroup,
        assignTabGroupId,
        setActiveSession,
    } = useSessionStore();

    useEffect(() => {
        if (
            !isUnlocked ||
            settings?.sessionRestoreEnabled === false ||
            offeredRef.current
        ) {
            return;
        }

        let cancelled = false;

        void (async () => {
            try {
                const exists = await SessionRestoreService.HasSnapshot();
                if (cancelled || !exists) {
                    return;
                }

                await Promise.all([
                    queryClient.ensureQueryData({ queryKey: HOSTS_QUERY_KEY }),
                    queryClient.ensureQueryData({ queryKey: KEYS_QUERY_KEY }),
                    queryClient.ensureQueryData({
                        queryKey: IDENTITIES_QUERY_KEY,
                    }),
                ]);

                const [snapshot, ok] = await SessionRestoreService.GetSnapshot();
                if (cancelled || !ok || !snapshot.tabs?.length) {
                    return;
                }

                if (useSessionStore.getState().sessions.length > 0) {
                    return;
                }

                offeredRef.current = true;
                setPendingSnapshot(snapshot);
                setPromptOpen(true);
            } catch (error) {
                console.error("session restore check failed", error);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isUnlocked, queryClient, settings?.sessionRestoreEnabled]);

    const restoreSnapshot = useCallback(
        async (snapshot: Snapshot) => {
            setRestoring(true);
            try {
                const hosts =
                    (await queryClient.ensureQueryData({
                        queryKey: HOSTS_QUERY_KEY,
                    })) ?? [];
                const keys =
                    (await queryClient.ensureQueryData({
                        queryKey: KEYS_QUERY_KEY,
                    })) ?? [];
                const identities =
                    (await queryClient.ensureQueryData({
                        queryKey: IDENTITIES_QUERY_KEY,
                    })) ?? [];

                const hostById = new Map(
                    (hosts as Host[]).map((host) => [host.id, host]),
                );

                for (const tab of snapshot.tabs) {
                    const resolvedHosts = tab.hostIds
                        .map((hostId) => hostById.get(hostId))
                        .filter((host): host is Host => host != null);

                    if (resolvedHosts.length === 0) {
                        continue;
                    }

                    const sessionIds: string[] = [];
                    for (const host of resolvedHosts) {
                        const sessionId = addSession(
                            buildSessionFromHost(
                                host,
                                keys as SavedKey[],
                                identities as SavedIdentity[],
                                hosts as Host[],
                            ),
                            { switchToTerminal: false, activate: false },
                        );
                        sessionIds.push(sessionId);
                    }

                    if (sessionIds.length >= 2) {
                        const tileRoot = deserializeTileLayout(
                            savedTileNodeFromTab(tab.tileLayout),
                            sessionIds,
                        );
                        assignTileGroup(sessionIds, tileRoot ?? undefined);
                    }

                    if (tab.tabGroupId) {
                        assignTabGroupId(sessionIds, tab.tabGroupId);
                    }
                }

                const { sessions } = useSessionStore.getState();
                const leaders = getTitleBarSessions(sessions);
                if (leaders.length === 0) {
                    toast.error(t("restore_none_available"));
                    return;
                }

                const activeLeader =
                    leaders[snapshot.activeTabIndex] ?? leaders[0];
                const memberIds = getTileGroupSessionIds(activeLeader, sessions);

                let activeId = activeLeader.id;
                if (snapshot.activeHostId) {
                    const match = sessions.find(
                        (session) =>
                            memberIds.includes(session.id) &&
                            sessionHostId(session) === snapshot.activeHostId,
                    );
                    if (match) {
                        activeId = match.id;
                    }
                }

                setActiveSession(activeId);
                useUIStore.getState().setActiveView(ViewType.Terminal);
                toast.success(
                    t("restore_success", { count: leaders.length }),
                );
            } catch (error) {
                toast.error(parseAppError(error).message);
            } finally {
                setRestoring(false);
            }
        },
        [
            addSession,
            assignTabGroupId,
            assignTileGroup,
            queryClient,
            setActiveSession,
            t,
        ],
    );

    const acceptRestore = useCallback(async () => {
        if (!pendingSnapshot) {
            setPromptOpen(false);
            return;
        }
        await restoreSnapshot(pendingSnapshot);
        setPromptOpen(false);
        setPendingSnapshot(null);
    }, [pendingSnapshot, restoreSnapshot]);

    const dismissRestore = useCallback(() => {
        setPromptOpen(false);
        setPendingSnapshot(null);
    }, []);

    const tabCount = pendingSnapshot?.tabs?.length ?? 0;

    return {
        promptOpen,
        tabCount,
        restoring,
        acceptRestore,
        dismissRestore,
    };
}
