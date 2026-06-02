import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { RelayHopConfig } from "../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { resolveHostCredentials } from "@/lib/resolveHostCredentials";
import {
    BUILTIN_LOCALHOST_HOST_ID,
    isBuiltinLocalhostHost,
} from "@/lib/defaultLocalhost";
import { resolveRelaySessionFields } from "@/lib/relayHost";
import type { CreateSessionParams, SudoCredential } from "@/store/sessionStore";
import type { ResolvedHostCredentials } from "@/lib/resolveHostCredentials";

export function buildSudoCredentials(
    host: Host,
    creds: ResolvedHostCredentials,
    identities: SavedIdentity[] | undefined,
): SudoCredential[] {
    const sudoCredentials: SudoCredential[] = [];
    const seen = new Set<string>();

    const addCredential = (id: string, label: string, password?: string) => {
        if (!password) return;
        const key = `${label}::${password}`;
        if (seen.has(key)) return;
        seen.add(key);
        sudoCredentials.push({ id, label, password });
    };

    addCredential("login-password", "Login password", creds.password);

    if (host.identityId) {
        const authIdentity = identities?.find((item) => item.id === host.identityId);
        if (authIdentity) {
            addCredential(
                `identity:${authIdentity.id}`,
                authIdentity.name || authIdentity.username,
                authIdentity.password,
            );
        }
    }

    for (const identityId of host.userpassIdentityIds ?? []) {
        const identity = identities?.find((item) => item.id === identityId);
        if (!identity) continue;
        addCredential(
            `identity:${identity.id}`,
            identity.name || identity.username,
            identity.password,
        );
    }

    return sudoCredentials;
}

export function buildLocalShellSession(
    title?: string,
    icon?: string,
    color?: string,
): CreateSessionParams {
    return {
        local: true,
        host: "",
        port: 0,
        username: "",
        title: title ?? "Local",
        hostId: BUILTIN_LOCALHOST_HOST_ID,
        icon,
        color,
    };
}

export function buildSessionFromHost(
    host: Host,
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
    allHosts?: Host[],
    overrides?: Partial<CreateSessionParams>,
): CreateSessionParams {
    if (isBuiltinLocalhostHost(host)) {
        return buildLocalShellSession(host.name, host.icon, host.color);
    }

    const creds = resolveHostCredentials(host, keys, identities);
    const sudoCredentials = buildSudoCredentials(host, creds, identities);

    const relay = resolveRelaySessionFields(
        host.relayHostId,
        allHosts,
        keys,
        identities,
    );

    const legacyRelay = relay?.relayHops?.[0];

    return {
        host: host.host,
        port: host.port,
        username: creds.username,
        password: creds.password,
        privateKey: creds.privateKey,
        title: host.name || host.host,
        hostId: host.id,
        icon: host.icon,
        color: host.color,
        sudoCredentials,
        startupCommand: host.startupCommand,
        environment: host.environment as Record<string, string> | undefined,
        terminalFontFamily: host.terminalFontFamily,
        terminalFontSize: host.terminalFontSize,
        relayHops: relay?.relayHops,
        forwardAgent: host.forwardAgent,
        relayHost: legacyRelay?.host,
        relayPort: legacyRelay?.port,
        relayUsername: legacyRelay?.username,
        relayPassword: legacyRelay?.password,
        relayPrivateKey: legacyRelay?.privateKey,
        ...overrides,
    };
}

export function applyRelayPassphrases(
    hops: RelayHopConfig[] | undefined,
    relayKeyPassphrase?: string,
): RelayHopConfig[] | undefined {
    if (!hops?.length || !relayKeyPassphrase) return hops;
    return hops.map((hop, index) =>
        index === 0
            ? new RelayHopConfig({ ...hop, keyPassphrase: relayKeyPassphrase })
            : hop,
    );
}
