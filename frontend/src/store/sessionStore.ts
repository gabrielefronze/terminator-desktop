import { create } from "zustand";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SSHConnectionConfig, SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
import { RelayHopConfig } from "../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { useUIStore, ViewType } from "@/store/uiStore";
import {
    findHostForSession,
    sessionAppearanceChanged,
    sessionAppearanceFromHost,
} from "@/lib/syncSessionHost";
import { BUILTIN_LOCALHOST_HOST_ID } from "@/lib/defaultLocalhost";
import {
    buildHorizontalTileChain,
    collectTileSessionIds,
    insertSessionIntoTile,
    MAX_TILE_PANES,
    removeSessionFromTile,
    resolveTileMother,
    resolveTileRoot,
    tileLeaf,
    tileSplit,
    type TileDropZone,
    type TileNode,
} from "@/lib/tileLayout";
import { getTileGroupSessionIds } from "@/lib/sessionTabs";

export interface TerminalSession {
    id: string;
    title: string;
    config: SSHConnectionConfig;
    hostId?: string;
    icon?: string;
    color?: string;
    sudoCredentials?: SudoCredential[];
    terminalFontFamily?: string;
    terminalFontSize?: number;
    splitPartnerId?: string;
    /** When set, this session is the secondary pane; the mother tab stays in the title bar. */
    splitMotherId?: string;
    /** Multi-pane tile layout owned by the mother tab. */
    tileRoot?: TileNode;
    /** Saved tab group this session belongs to, if any. */
    tabGroupId?: string;
    /** SSH client for port forwarding only — no terminal tab or shell. */
    forwardOnly?: boolean;
}

export interface SudoCredential {
    id: string;
    label: string;
    password: string;
}

export interface CreateSessionParams {
    local?: boolean;
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
    title?: string;
    hostId?: string;
    icon?: string;
    color?: string;
    sudoCredentials?: SudoCredential[];
    relayHost?: string;
    relayPort?: number;
    relayUsername?: string;
    relayPassword?: string;
    relayPrivateKey?: string;
    relayHops?: RelayHopConfig[];
    keyPassphrase?: string;
    keyboardInteractivePassword?: string;
    startupCommand?: string;
    environment?: Record<string, string>;
    terminalFontFamily?: string;
    terminalFontSize?: number;
}

interface SessionState {
    sessions: TerminalSession[];
    activeSessionId: string | null;
    /** Incremented per session when the user requests a reconnect from the tab menu. */
    reconnectRequests: Record<string, number>;
    addSession: (
        params: CreateSessionParams,
        options?: {
            switchToTerminal?: boolean;
            forwardOnly?: boolean;
            activate?: boolean;
        },
    ) => string;
    openLocalRemoteSplit: (
        localParams: CreateSessionParams,
        remoteParams: CreateSessionParams,
    ) => string;
    removeSession: (id: string) => void;
    closeTileGroup: (leaderId: string) => void;
    linkSplitSessions: (sourceId: string, targetId: string) => void;
    addSessionToTile: (
        sourceId: string,
        targetId: string,
        zone?: TileDropZone,
    ) => void;
    assignTileGroup: (sessionIds: string[], tileRoot?: TileNode) => void;
    assignTabGroupId: (sessionIds: string[], tabGroupId: string) => void;
    setActiveSession: (id: string) => void;
    setAllSessionsTerminalFontSize: (size: number) => void;
    syncSessionsFromHosts: (hosts: Host[]) => void;
    clearSessions: () => void;
    requestReconnect: (sessionId: string) => void;
}

function pickActiveSessionAfterClose(
    previousSessions: TerminalSession[],
    newSessions: TerminalSession[],
    closedId: string,
    previousActiveId: string | null,
    remainingInGroup: string[],
): string | null {
    if (!previousActiveId || previousActiveId !== closedId) {
        return previousActiveId;
    }

    if (remainingInGroup.length > 0) {
        return remainingInGroup[0];
    }

    if (newSessions.length === 0) {
        return null;
    }

    const closedIndex = previousSessions.findIndex(
        (session) => session.id === closedId,
    );
    return newSessions[closedIndex - 1]?.id ?? newSessions[0].id;
}

function applySingleSessionRemoval(
    sessions: TerminalSession[],
    closingId: string,
): TerminalSession[] {
    const closing = sessions.find((session) => session.id === closingId);
    if (!closing) return sessions;

    const mother = resolveTileMother(closing, sessions);
    const tileRoot = resolveTileRoot(mother, sessions);
    const memberCount = tileRoot ? collectTileSessionIds(tileRoot).length : 1;

    if (!tileRoot || memberCount <= 1) {
        return sessions.filter((session) => session.id !== closingId);
    }

    const nextRoot = removeSessionFromTile(tileRoot, closingId);
    if (!nextRoot) {
        return sessions.filter((session) => session.id !== closingId);
    }

    const remainingIds = collectTileSessionIds(nextRoot);
    if (remainingIds.length === 1) {
        const remainingId = remainingIds[0];
        return sessions
            .filter((session) => session.id !== closingId)
            .map((session) =>
                session.id === remainingId
                    ? {
                          ...session,
                          tileRoot: undefined,
                          splitMotherId: undefined,
                          splitPartnerId: undefined,
                      }
                    : session,
            );
    }

    const closingMother = mother.id === closingId;
    const nextMotherId = closingMother ? remainingIds[0] : mother.id;
    const previousMother = sessions.find((session) => session.id === mother.id);

    return sessions
        .filter((session) => session.id !== closingId)
        .map((session) => {
            if (session.id === nextMotherId) {
                return {
                    ...session,
                    tileRoot: nextRoot,
                    splitMotherId: undefined,
                    splitPartnerId: undefined,
                    tabGroupId:
                        closingMother && previousMother?.tabGroupId
                            ? previousMother.tabGroupId
                            : session.tabGroupId,
                };
            }

            if (remainingIds.includes(session.id)) {
                return {
                    ...session,
                    splitMotherId: nextMotherId,
                    splitPartnerId: undefined,
                    tileRoot: undefined,
                };
            }

            return session;
        });
}

export const useSessionStore = create<SessionState>((set, get) => ({
    sessions: [],
    activeSessionId: null,
    reconnectRequests: {},

    addSession: (params, options) => {
        const forwardOnly = options?.forwardOnly === true;
        const switchToTerminal = forwardOnly
            ? false
            : options?.switchToTerminal !== false;
        const activate = forwardOnly
            ? false
            : options?.activate !== false;
        const newId = crypto.randomUUID();
        set((state) => {
        const fullConfig = new SSHConnectionConfig({
            id: newId,
            local: params.local ?? false,
            host: params.host,
            port: params.port,
            username: params.username,
            password: params.password,
            privateKey: params.privateKey,
            keyPassphrase: params.keyPassphrase,
            keyboardInteractivePassword: params.keyboardInteractivePassword,
            startupCommand: params.startupCommand,
            environment: params.environment,
            relayHost: params.relayHost,
            relayPort: params.relayPort,
            relayUsername: params.relayUsername,
            relayPassword: params.relayPassword,
            relayPrivateKey: params.relayPrivateKey,
            relayHops: params.relayHops,
        });

        const newSession: TerminalSession = {
            id: newId,
            title: params.title || params.host,
            config: fullConfig,
            hostId:
                params.hostId ??
                (params.local ? BUILTIN_LOCALHOST_HOST_ID : undefined),
            icon: params.icon,
            color: params.color,
            sudoCredentials: params.sudoCredentials,
            terminalFontFamily: params.terminalFontFamily,
            terminalFontSize: params.terminalFontSize,
            forwardOnly,
        };

        if (switchToTerminal) {
            useUIStore.getState().setActiveView(ViewType.Terminal);
        }

        return {
            sessions: [...state.sessions, newSession],
            activeSessionId: activate ? newId : state.activeSessionId,
        };
        });
        return newId;
    },

    openLocalRemoteSplit: (localParams, remoteParams) => {
        const localId = crypto.randomUUID();
        const remoteId = crypto.randomUUID();

        const localConfig = new SSHConnectionConfig({
            id: localId,
            local: true,
            host: localParams.host,
            port: localParams.port,
            username: localParams.username,
        });

        const remoteConfig = new SSHConnectionConfig({
            id: remoteId,
            local: false,
            host: remoteParams.host,
            port: remoteParams.port,
            username: remoteParams.username,
            password: remoteParams.password,
            privateKey: remoteParams.privateKey,
            keyPassphrase: remoteParams.keyPassphrase,
            keyboardInteractivePassword: remoteParams.keyboardInteractivePassword,
            startupCommand: remoteParams.startupCommand,
            environment: remoteParams.environment,
            relayHost: remoteParams.relayHost,
            relayPort: remoteParams.relayPort,
            relayUsername: remoteParams.relayUsername,
            relayPassword: remoteParams.relayPassword,
            relayPrivateKey: remoteParams.relayPrivateKey,
            relayHops: remoteParams.relayHops,
        });

        const localSession: TerminalSession = {
            id: localId,
            title: localParams.title || "Local",
            config: localConfig,
            hostId:
                localParams.hostId ??
                (localParams.local ? BUILTIN_LOCALHOST_HOST_ID : undefined),
            icon: localParams.icon,
            color: localParams.color,
            splitPartnerId: remoteId,
            splitMotherId: remoteId,
        };

        const remoteSession: TerminalSession = {
            id: remoteId,
            title: remoteParams.title || remoteParams.host,
            config: remoteConfig,
            hostId: remoteParams.hostId,
            icon: remoteParams.icon,
            color: remoteParams.color,
            sudoCredentials: remoteParams.sudoCredentials,
            terminalFontFamily: remoteParams.terminalFontFamily,
            terminalFontSize: remoteParams.terminalFontSize,
            splitPartnerId: localId,
            tileRoot: tileSplit(
                "horizontal",
                tileLeaf(localId),
                tileLeaf(remoteId),
            ),
        };

        set((state) => ({
            sessions: [...state.sessions, localSession, remoteSession],
            activeSessionId: remoteId,
        }));
        useUIStore.getState().setActiveView(ViewType.Terminal);
        return remoteId;
    },

    linkSplitSessions: (sourceId, targetId) => {
        get().addSessionToTile(sourceId, targetId, "right");
    },

    addSessionToTile: (sourceId, targetId, zone = "right") => {
        if (sourceId === targetId) return;

        set((state) => {
            const source = state.sessions.find((session) => session.id === sourceId);
            const target = state.sessions.find((session) => session.id === targetId);
            if (!source || !target) return state;

            const sourceMother = resolveTileMother(source, state.sessions);
            const targetMother = resolveTileMother(target, state.sessions);

            if (
                sourceMother.id === targetMother.id ||
                collectTileSessionIds(
                    resolveTileRoot(targetMother, state.sessions) ??
                        tileLeaf(targetMother.id),
                ).includes(sourceId)
            ) {
                return state;
            }

            let sessions = state.sessions.map((session) => ({ ...session }));

            const detachSession = (sessionId: string) => {
                const session = sessions.find((item) => item.id === sessionId);
                if (!session) return;

                const mother = resolveTileMother(session, sessions);
                const root = resolveTileRoot(mother, sessions);
                if (!root) return;

                const idsInTree = collectTileSessionIds(root);
                if (idsInTree.length <= 1) {
                    sessions = sessions.map((item) =>
                        item.id === mother.id
                            ? {
                                  ...item,
                                  tileRoot: undefined,
                                  splitPartnerId: undefined,
                                  splitMotherId: undefined,
                                  tabGroupId: undefined,
                              }
                            : item,
                    );
                    return;
                }

                const nextRoot = removeSessionFromTile(root, sessionId);
                if (!nextRoot) return;

                sessions = sessions.map((item) => {
                    if (item.id === mother.id) {
                        return {
                            ...item,
                            tileRoot: nextRoot,
                            splitPartnerId: undefined,
                            tabGroupId: undefined,
                        };
                    }
                    if (item.splitMotherId === mother.id && item.id !== sessionId) {
                        return {
                            ...item,
                            splitMotherId: undefined,
                            splitPartnerId: undefined,
                            tabGroupId: undefined,
                        };
                    }
                    if (item.id === sessionId) {
                        return {
                            ...item,
                            tileRoot: undefined,
                            splitPartnerId: undefined,
                            splitMotherId: undefined,
                            tabGroupId: undefined,
                        };
                    }
                    return item;
                });

                const remainingIds = collectTileSessionIds(nextRoot);
                sessions = sessions.map((item) => {
                    if (item.id === mother.id) {
                        return { ...item, tileRoot: nextRoot };
                    }
                    if (remainingIds.includes(item.id) && item.id !== mother.id) {
                        return {
                            ...item,
                            splitMotherId: mother.id,
                            splitPartnerId: undefined,
                            tabGroupId: undefined,
                        };
                    }
                    return item;
                });
            };

            detachSession(sourceId);

            const refreshedSource = sessions.find((session) => session.id === sourceId);
            const refreshedTarget = sessions.find((session) => session.id === targetId);
            if (!refreshedSource || !refreshedTarget) return state;

            const targetMotherAfterDetach = resolveTileMother(
                refreshedTarget,
                sessions,
            );
            const existingRoot = resolveTileRoot(
                targetMotherAfterDetach,
                sessions,
            );
            const baseRoot =
                existingRoot && existingRoot.kind === "leaf"
                    ? existingRoot
                    : existingRoot ?? tileLeaf(targetMotherAfterDetach.id);

            const currentCount = collectTileSessionIds(baseRoot).length;
            if (currentCount >= MAX_TILE_PANES) {
                return state;
            }

            const nextRoot = insertSessionIntoTile(
                baseRoot,
                targetId,
                sourceId,
                zone,
            );
            const memberIds = collectTileSessionIds(nextRoot);

            sessions = sessions.map((session) => {
                if (session.id === targetMotherAfterDetach.id) {
                    return {
                        ...session,
                        tileRoot: nextRoot,
                        splitPartnerId: undefined,
                        splitMotherId: undefined,
                        tabGroupId: undefined,
                    };
                }
                if (memberIds.includes(session.id) && session.id !== targetMotherAfterDetach.id) {
                    return {
                        ...session,
                        splitMotherId: targetMotherAfterDetach.id,
                        splitPartnerId: undefined,
                        tabGroupId: undefined,
                        tileRoot: undefined,
                    };
                }
                if (session.id === sourceId) {
                    return {
                        ...session,
                        splitMotherId: targetMotherAfterDetach.id,
                        splitPartnerId: undefined,
                        tabGroupId: undefined,
                        tileRoot: undefined,
                    };
                }
                return session;
            });

            useUIStore.getState().setActiveView(ViewType.Terminal);

            const nextActiveId =
                state.activeSessionId === sourceId ||
                state.activeSessionId === targetId
                    ? state.activeSessionId
                    : targetId;

            return {
                sessions,
                activeSessionId: nextActiveId,
            };
        });
    },

    assignTileGroup: (sessionIds, tileRoot) => {
        if (sessionIds.length < 2) return;

        set((state) => {
            const motherId = sessionIds[0];
            const root = tileRoot ?? buildHorizontalTileChain(sessionIds);
            const memberIds = collectTileSessionIds(root);

            const sessions = state.sessions.map((session) => {
                if (session.id === motherId) {
                    return {
                        ...session,
                        tileRoot: root,
                        splitPartnerId: undefined,
                        splitMotherId: undefined,
                    };
                }
                if (memberIds.includes(session.id)) {
                    return {
                        ...session,
                        splitMotherId: motherId,
                        splitPartnerId: undefined,
                        tileRoot: undefined,
                    };
                }
                return session;
            });

            return { sessions };
        });
    },

    assignTabGroupId: (sessionIds, tabGroupId) => {
        const idSet = new Set(sessionIds);
        set((state) => ({
            sessions: state.sessions.map((session) =>
                idSet.has(session.id) ? { ...session, tabGroupId } : session,
            ),
        }));
    },

    removeSession: (id) => {
        const state = get();
        const closing = state.sessions.find((session) => session.id === id);
        if (!closing) return;

        const mother = resolveTileMother(closing, state.sessions);
        const tileRoot = resolveTileRoot(mother, state.sessions);
        const remainingInGroup = tileRoot
            ? collectTileSessionIds(tileRoot).filter(
                  (sessionId) => sessionId !== id,
              )
            : [];

        void SshService.Disconnect(id).catch(console.error);

        set((state) => {
            const closing = state.sessions.find((session) => session.id === id);
            if (!closing) return state;

            const newSessions = applySingleSessionRemoval(state.sessions, id);
            const newActiveId = pickActiveSessionAfterClose(
                state.sessions,
                newSessions,
                id,
                state.activeSessionId,
                remainingInGroup,
            );

            if (newSessions.length === 0) {
                useUIStore.getState().setActiveView(ViewType.Hosts);
            }

            return {
                sessions: newSessions,
                activeSessionId: newActiveId,
            };
        });
    },

    closeTileGroup: (leaderId) => {
        const state = get();
        const leader = state.sessions.find((session) => session.id === leaderId);
        if (!leader) return;

        const tileRoot = resolveTileRoot(leader, state.sessions);
        const idsToRemove = tileRoot
            ? collectTileSessionIds(tileRoot)
            : [leaderId];

        idsToRemove.forEach((sessionId) => {
            void SshService.Disconnect(sessionId).catch(console.error);
        });

        set((state) => {
            const leader = state.sessions.find(
                (session) => session.id === leaderId,
            );
            if (!leader) return state;

            const tileRoot = resolveTileRoot(leader, state.sessions);
            const idsToRemove = new Set(
                tileRoot ? collectTileSessionIds(tileRoot) : [leaderId],
            );

            const newSessions = state.sessions.filter(
                (session) => !idsToRemove.has(session.id),
            );

            let newActiveId = state.activeSessionId;
            if (state.activeSessionId && idsToRemove.has(state.activeSessionId)) {
                if (newSessions.length > 0) {
                    const closedIndex = state.sessions.findIndex(
                        (session) => session.id === leaderId,
                    );
                    newActiveId =
                        newSessions[closedIndex - 1]?.id ?? newSessions[0].id;
                } else {
                    newActiveId = null;
                    useUIStore.getState().setActiveView(ViewType.Hosts);
                }
            }

            return {
                sessions: newSessions,
                activeSessionId: newActiveId,
            };
        });
    },

    setActiveSession: (id) => {
        useUIStore.getState().setActiveView(ViewType.Terminal);
        set({activeSessionId: id});
    },

    setAllSessionsTerminalFontSize: (size) =>
        set((state) => ({
            sessions: state.sessions.map((session) => ({
                ...session,
                terminalFontSize: size,
            })),
        })),

    syncSessionsFromHosts: (hosts) =>
        set((state) => {
            let changed = false;
            const sessions = state.sessions.map((session) => {
                const host = findHostForSession(session, hosts);
                if (!host) return session;

                const nextAppearance = sessionAppearanceFromHost(session, host);
                if (!sessionAppearanceChanged(session, nextAppearance)) {
                    return session;
                }

                changed = true;
                return { ...session, ...nextAppearance };
            });

            return changed ? { sessions } : state;
        }),

    requestReconnect: (sessionId) => {
        const state = get();
        const leader = state.sessions.find((session) => session.id === sessionId);
        if (!leader) {
            return;
        }

        const memberIds = getTileGroupSessionIds(leader, state.sessions);
        set((current) => {
            const reconnectRequests = { ...current.reconnectRequests };
            for (const id of memberIds) {
                const session = current.sessions.find((item) => item.id === id);
                if (!session || session.forwardOnly) {
                    continue;
                }
                reconnectRequests[id] = (reconnectRequests[id] ?? 0) + 1;
            }
            return { reconnectRequests };
        });
    },

    clearSessions: () => {
        const {sessions} = get();
        sessions.forEach((session) => {
            SshService.Disconnect(session.id).catch(console.error);
        });

        // Wipe the local state and return to hosts
        useUIStore.getState().setActiveView(ViewType.Hosts);
        set({sessions: [], activeSessionId: null, reconnectRequests: {}});
    }
}));