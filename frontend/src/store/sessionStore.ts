import { create } from "zustand";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SSHConnectionConfig, SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
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
}

interface SessionState {
    sessions: TerminalSession[];
    activeSessionId: string | null;
    addSession: (params: CreateSessionParams) => void;
    removeSession: (id: string) => void;
    setActiveSession: (id: string) => void;
    syncSessionsFromHosts: (hosts: Host[]) => void;
    clearSessions: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
    sessions: [],
    activeSessionId: null,

    addSession: (params) => set((state) => {
        const newId = crypto.randomUUID();

        const fullConfig = new SSHConnectionConfig({
            id: newId,
            local: params.local ?? false,
            host: params.host,
            port: params.port,
            username: params.username,
            password: params.password,
            privateKey: params.privateKey,
            relayHost: params.relayHost,
            relayPort: params.relayPort,
            relayUsername: params.relayUsername,
            relayPassword: params.relayPassword,
            relayPrivateKey: params.relayPrivateKey,
        });

        const newSession: TerminalSession = {
            id: newId,
            title: params.title || params.host,
            config: fullConfig,
            hostId: params.hostId,
            icon: params.icon,
            color: params.color,
            sudoCredentials: params.sudoCredentials,
        };

        useUIStore.getState().setActiveView(ViewType.Terminal);

        return {
            sessions: [...state.sessions, newSession],
            activeSessionId: newId,
        };
    }),

    removeSession: (id) => set((state) => {
        const newSessions = state.sessions.filter((s) => s.id !== id);
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