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
    addSession: (
        params: CreateSessionParams,
        options?: { switchToTerminal?: boolean },
    ) => string;
    openLocalRemoteSplit: (
        localParams: CreateSessionParams,
        remoteParams: CreateSessionParams,
    ) => string;
    removeSession: (id: string) => void;
    setActiveSession: (id: string) => void;
    syncSessionsFromHosts: (hosts: Host[]) => void;
    clearSessions: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
    sessions: [],
    activeSessionId: null,

    addSession: (params, options) => {
        const switchToTerminal = options?.switchToTerminal !== false;
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
            hostId: params.hostId,
            icon: params.icon,
            color: params.color,
            sudoCredentials: params.sudoCredentials,
            terminalFontFamily: params.terminalFontFamily,
            terminalFontSize: params.terminalFontSize,
        };

        if (switchToTerminal) {
            useUIStore.getState().setActiveView(ViewType.Terminal);
        }

        return {
            sessions: [...state.sessions, newSession],
            activeSessionId: newId,
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
            hostId: localParams.hostId,
            icon: localParams.icon,
            color: localParams.color,
            splitPartnerId: remoteId,
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
        };

        set((state) => ({
            sessions: [...state.sessions, localSession, remoteSession],
            activeSessionId: remoteId,
        }));
        useUIStore.getState().setActiveView(ViewType.Terminal);
        return remoteId;
    },

    removeSession: (id) => set((state) => {
        const closing = state.sessions.find((s) => s.id === id);
        const partnerId = closing?.splitPartnerId;
        const newSessions = state.sessions
            .filter((s) => s.id !== id)
            .map((s) =>
                s.id === partnerId ? { ...s, splitPartnerId: undefined } : s,
            );
        let newActiveId = state.activeSessionId;

        if (state.activeSessionId === id) {
            if (newSessions.length > 0) {
                const closedIndex = state.sessions.findIndex((s) => s.id === id);
                const fallbackSession = newSessions[closedIndex - 1] || newSessions[0];
                newActiveId = fallbackSession.id;
            } else {
                newActiveId = null;
                useUIStore.getState().setActiveView(ViewType.Hosts);
            }
        }

        return {
            sessions: newSessions,
            activeSessionId: newActiveId,
        };
    }),

    setActiveSession: (id) => {
        useUIStore.getState().setActiveView(ViewType.Terminal);
        set({activeSessionId: id});
    },

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

    clearSessions: () => {
        const {sessions} = get();
        sessions.forEach((session) => {
            SshService.Disconnect(session.id).catch(console.error);
        });

        // Wipe the local state and return to hosts
        useUIStore.getState().setActiveView(ViewType.Hosts);
        set({sessions: [], activeSessionId: null});
    }
}));