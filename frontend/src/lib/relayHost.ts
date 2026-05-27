import type { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import {
    BUILTIN_LOCALHOST_HOST_ID,
    isBuiltinLocalhostHost,
} from "@/lib/defaultLocalhost";
import { resolveHostCredentials } from "@/lib/resolveHostCredentials";
import type { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import type { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";

export type RelaySessionFields = {
    relayHost: string;
    relayPort: number;
    relayUsername: string;
    relayPassword?: string;
    relayPrivateKey?: string;
};

export function findRelayHost(
    relayHostId: string | undefined,
    allHosts: Host[] | undefined,
): Host | undefined {
    if (!relayHostId || !allHosts) return undefined;
    return allHosts.find((host) => host.id === relayHostId);
}

export function validateRelayHostId(
    hostId: string | undefined,
    relayHostId: string | undefined,
    allHosts: Host[] | undefined,
): string | null {
    if (!relayHostId || relayHostId === "none") {
        return null;
    }
    if (relayHostId === hostId) {
        return "relay_self";
    }
    if (relayHostId === BUILTIN_LOCALHOST_HOST_ID) {
        return "relay_localhost";
    }
    const relay = findRelayHost(relayHostId, allHosts);
    if (!relay) {
        return "relay_missing";
    }
    if (isBuiltinLocalhostHost(relay)) {
        return "relay_localhost";
    }
    if (relay.relayHostId) {
        return "relay_chain";
    }
    return null;
}

export function resolveRelaySessionFields(
    relayHostId: string | undefined,
    allHosts: Host[] | undefined,
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
): RelaySessionFields | undefined {
    const relay = findRelayHost(relayHostId, allHosts);
    if (!relay || isBuiltinLocalhostHost(relay)) {
        return undefined;
    }

    const creds = resolveHostCredentials(relay, keys, identities);
    return {
        relayHost: relay.host,
        relayPort: relay.port > 0 ? relay.port : 22,
        relayUsername: creds.username,
        relayPassword: creds.password,
        relayPrivateKey: creds.privateKey,
    };
}
