import { useCallback, useState } from "react";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { HostKeyCheck } from "../../bindings/terminator-desktop/backend/internal/services/knownhosts/models";
import { Service as KnownHostsService } from "../../bindings/terminator-desktop/backend/internal/services/knownhosts";
import { SSHConnectionConfig } from "../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { buildSessionFromHost } from "@/lib/connectHost";
import { hostsToVerifyForSession } from "@/lib/relayHost";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import { useResolvedLocalhostHost } from "@/hooks/useResolvedLocalhostHost";
import { useSessionStore, type CreateSessionParams } from "@/store/sessionStore";
import { toast } from "sonner";

type ConnectMode = "terminal" | "split-with-local" | "sftp";

type PendingConnect = {
    params: CreateSessionParams;
    localParams?: CreateSessionParams;
    endpoints: Array<{ host: string; port: number }>;
    endpointIndex: number;
    mode: ConnectMode;
    onSftpConfig?: (config: SSHConnectionConfig) => void;
};

function paramsToSshConfig(params: CreateSessionParams): SSHConnectionConfig {
    return new SSHConnectionConfig({
        id: crypto.randomUUID(),
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
    const openLocalRemoteSplit = useSessionStore((s) => s.openLocalRemoteSplit);
    const { host: localhostHost } = useResolvedLocalhostHost();
    const [hostKeyCheck, setHostKeyCheck] = useState<HostKeyCheck | null>(null);
    const [pending, setPending] = useState<PendingConnect | null>(null);

    const finishConnect = useCallback(
        (state: PendingConnect) => {
            if (state.mode === "split-with-local" && state.localParams) {
                openLocalRemoteSplit(state.localParams, state.params);
            } else if (state.mode === "sftp") {
                state.onSftpConfig?.(paramsToSshConfig(state.params));
            } else {
                addSession(state.params);
            }
            setPending(null);
            setHostKeyCheck(null);
        },
        [addSession, openLocalRemoteSplit],
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
        ) => {
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
                    return;
                }
                if (mode === "split-with-local") {
                    toast.error("Select a remote host for split workspace");
                    return;
                }
                addSession(params);
                return;
            }

            let localParams: CreateSessionParams | undefined;
            if (mode === "split-with-local") {
                if (!localhostHost) {
                    toast.error("Enable local shell in settings to use split workspace");
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

            await continueHostKeyChecks({
                params,
                localParams,
                endpoints,
                endpointIndex: 0,
                mode,
                onSftpConfig,
            });
        },
        [
            keys,
            identities,
            allHosts,
            localhostHost,
            addSession,
            continueHostKeyChecks,
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
        setPending(null);
        setHostKeyCheck(null);
    }, []);

    return {
        connect,
        connectSplitWithLocal,
        connectSftp,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    };
}
