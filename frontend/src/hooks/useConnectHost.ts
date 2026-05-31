import { useCallback, useRef, useState } from "react";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { HostKeyCheck } from "../../bindings/terminator-desktop/backend/internal/services/knownhosts/models";
import { Service as KnownHostsService } from "../../bindings/terminator-desktop/backend/internal/services/knownhosts";
import { SSHConnectionConfig } from "../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
import { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { buildSessionFromHost } from "@/lib/connectHost";
import { hostsToVerifyForSession } from "@/lib/relayHost";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import { useResolvedLocalhostHost } from "@/hooks/useResolvedLocalhostHost";
import { useSessionStore, type CreateSessionParams } from "@/store/sessionStore";
import { toast } from "sonner";

type ConnectMode = "terminal" | "split-with-local" | "sftp" | "forward-only";

/** Ignore repeat connect attempts within this window (typical double-click interval). */
const CONNECT_DEBOUNCE_MS = 400;

type PendingConnect = {
    params: CreateSessionParams;
    localParams?: CreateSessionParams;
    endpoints: Array<{ host: string; port: number }>;
    endpointIndex: number;
    mode: ConnectMode;
    onSftpConfig?: (config: SSHConnectionConfig) => void;
    forwardConnect?: {
        resolve: (sessionId: string) => void;
        reject: (error: unknown) => void;
    };
};

function paramsToSshConfig(
    params: CreateSessionParams,
    sessionId?: string,
): SSHConnectionConfig {
    return new SSHConnectionConfig({
        id: sessionId ?? crypto.randomUUID(),
        local: false,
        host: params.host,
        port: params.port,
        username: params.username,
        password: params.password,
        privateKey: params.privateKey,
        keyPassphrase: params.keyPassphrase,
        keyboardInteractivePassword: params.keyboardInteractivePassword,
        relayHost: params.relayHost,
        relayPort: params.relayPort,
        relayUsername: params.relayUsername,
        relayPassword: params.relayPassword,
        relayPrivateKey: params.relayPrivateKey,
        relayHops: params.relayHops,
    });
}

export function useConnectHost(
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
    allHosts: Host[] | undefined,
) {
    const addSession = useSessionStore((s) => s.addSession);
    const removeSession = useSessionStore((s) => s.removeSession);
    const openLocalRemoteSplit = useSessionStore((s) => s.openLocalRemoteSplit);
    const { host: localhostHost } = useResolvedLocalhostHost();
    const [hostKeyCheck, setHostKeyCheck] = useState<HostKeyCheck | null>(null);
    const [pending, setPending] = useState<PendingConnect | null>(null);
    const connectingHostIdsRef = useRef(new Set<string>());
    const lastConnectAttemptRef = useRef(new Map<string, number>());

    const releaseConnect = useCallback((hostId: string) => {
        connectingHostIdsRef.current.delete(hostId);
    }, []);

    const tryAcquireConnect = useCallback((hostId: string): boolean => {
        if (connectingHostIdsRef.current.has(hostId)) {
            return false;
        }

        const now = Date.now();
        const lastAttempt = lastConnectAttemptRef.current.get(hostId);
        if (
            lastAttempt !== undefined &&
            now - lastAttempt < CONNECT_DEBOUNCE_MS
        ) {
            return false;
        }

        lastConnectAttemptRef.current.set(hostId, now);
        connectingHostIdsRef.current.add(hostId);
        return true;
    }, []);

    const finishConnect = useCallback(
        (state: PendingConnect) => {
            if (state.mode === "split-with-local" && state.localParams) {
                openLocalRemoteSplit(state.localParams, state.params);
            } else if (state.mode === "sftp") {
                state.onSftpConfig?.(paramsToSshConfig(state.params));
            } else if (state.mode === "forward-only") {
                const sessionId = addSession(state.params, {
                    forwardOnly: true,
                    switchToTerminal: false,
                    activate: false,
                });
                const config = paramsToSshConfig(state.params, sessionId);
                void SshService.ConnectForwardOnly(config)
                    .then(() => {
                        state.forwardConnect?.resolve(sessionId);
                    })
                    .catch((err) => {
                        removeSession(sessionId);
                        state.forwardConnect?.reject(err);
                    })
                    .finally(() => {
                        releaseConnect(state.params.hostId ?? "");
                        setPending(null);
                        setHostKeyCheck(null);
                    });
                return;
            } else {
                addSession(state.params);
            }
            releaseConnect(state.params.hostId ?? "");
            setPending(null);
            setHostKeyCheck(null);
        },
        [addSession, openLocalRemoteSplit, releaseConnect, removeSession],
    );

    const continueHostKeyChecks = useCallback(
        async (state: PendingConnect) => {
            for (let i = state.endpointIndex; i < state.endpoints.length; i++) {
                const endpoint = state.endpoints[i];
                const check = await KnownHostsService.CheckHost(
                    endpoint.host,
                    endpoint.port,
                );
                if (check.status === "trusted") {
                    continue;
                }
                setPending({ ...state, endpointIndex: i });
                setHostKeyCheck(check);
                return;
            }
            finishConnect(state);
        },
        [finishConnect],
    );

    const startRemoteConnect = useCallback(
        async (
            host: Host,
            mode: ConnectMode,
            overrides?: Partial<CreateSessionParams>,
            onSftpConfig?: (config: SSHConnectionConfig) => void,
            forwardConnect?: PendingConnect["forwardConnect"],
        ) => {
            if (!tryAcquireConnect(host.id)) {
                forwardConnect?.reject(new Error("Already connecting to this host"));
                return;
            }

            const params = buildSessionFromHost(
                host,
                keys,
                identities,
                allHosts,
                overrides,
            );

            if (params.local || isBuiltinLocalhostHost(host)) {
                if (mode === "sftp") {
                    toast.error("Select a remote host for SFTP");
                    releaseConnect(host.id);
                    forwardConnect?.reject(new Error("Local host cannot be used for SFTP"));
                    return;
                }
                if (mode === "split-with-local") {
                    toast.error("Select a remote host for split workspace");
                    releaseConnect(host.id);
                    forwardConnect?.reject(new Error("Local host cannot be used for split workspace"));
                    return;
                }
                if (mode === "forward-only") {
                    toast.error("Select a remote host for port forwarding");
                    releaseConnect(host.id);
                    forwardConnect?.reject(new Error("Local host cannot be used for port forwarding"));
                    return;
                }
                addSession(params);
                releaseConnect(host.id);
                return;
            }

            let localParams: CreateSessionParams | undefined;
            if (mode === "split-with-local") {
                if (!localhostHost) {
                    toast.error("Enable local shell in settings to use split workspace");
                    releaseConnect(host.id);
                    return;
                }
                localParams = buildSessionFromHost(
                    localhostHost,
                    keys,
                    identities,
                    allHosts,
                );
            }

            const endpoints = hostsToVerifyForSession(
                params.host,
                params.port,
                params.relayHops,
            );

            try {
                await continueHostKeyChecks({
                    params,
                    localParams,
                    endpoints,
                    endpointIndex: 0,
                    mode,
                    onSftpConfig,
                    forwardConnect,
                });
            } catch (error) {
                releaseConnect(host.id);
                forwardConnect?.reject(error);
            }
        },
        [
            keys,
            identities,
            allHosts,
            localhostHost,
            addSession,
            continueHostKeyChecks,
            tryAcquireConnect,
            releaseConnect,
        ],
    );

    const connect = useCallback(
        (host: Host, overrides?: Partial<CreateSessionParams>) =>
            startRemoteConnect(host, "terminal", overrides),
        [startRemoteConnect],
    );

    const connectSplitWithLocal = useCallback(
        (host: Host) => startRemoteConnect(host, "split-with-local"),
        [startRemoteConnect],
    );

    const connectSftp = useCallback(
        (host: Host, onSftpConfig: (config: SSHConnectionConfig) => void) =>
            startRemoteConnect(host, "sftp", undefined, onSftpConfig),
        [startRemoteConnect],
    );

    const connectForwardOnly = useCallback(
        (host: Host): Promise<string> =>
            new Promise((resolve, reject) => {
                void startRemoteConnect(
                    host,
                    "forward-only",
                    undefined,
                    undefined,
                    { resolve, reject },
                );
            }),
        [startRemoteConnect],
    );

    const trustHostKey = useCallback(async () => {
        if (!pending || !hostKeyCheck) return;
        await KnownHostsService.TrustHost(
            hostKeyCheck.host,
            hostKeyCheck.port,
            hostKeyCheck.fingerprint,
            hostKeyCheck.keyType,
        );
        await continueHostKeyChecks({
            ...pending,
            endpointIndex: pending.endpointIndex + 1,
        });
    }, [pending, hostKeyCheck, continueHostKeyChecks]);

    const cancelHostKey = useCallback(() => {
        if (pending?.params.hostId) {
            releaseConnect(pending.params.hostId);
        }
        pending?.forwardConnect?.reject(
            new Error("Host key verification cancelled"),
        );
        setPending(null);
        setHostKeyCheck(null);
    }, [pending, releaseConnect]);

    return {
        connect,
        connectSplitWithLocal,
        connectSftp,
        connectForwardOnly,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    };
}
