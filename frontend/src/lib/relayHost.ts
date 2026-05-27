import type { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { RelayHopConfig } from "../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import {
    BUILTIN_LOCALHOST_HOST_ID,
    isBuiltinLocalhostHost,
} from "@/lib/defaultLocalhost";
import { resolveHostCredentials } from "@/lib/resolveHostCredentials";
import type { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import type { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";

export type RelaySessionFields = {
    relayHops: RelayHopConfig[];
};

export function findRelayHost(
    relayHostId: string | undefined,
    allHosts: Host[] | undefined,
): Host | undefined {
    if (!relayHostId || !allHosts) return undefined;
    return allHosts.find((host) => host.id === relayHostId);
}

function hasRelayCycle(
    hostId: string | undefined,
    relayHostId: string | undefined,
    allHosts: Host[] | undefined,
): boolean {
    if (!relayHostId || !allHosts) return false;
    const visited = new Set<string>();
    if (hostId) visited.add(hostId);

    let currentId: string | undefined = relayHostId;
    while (currentId) {
        if (visited.has(currentId)) return true;
        visited.add(currentId);
        const relay = findRelayHost(currentId, allHosts);
        if (!relay) return false;
        currentId = relay.relayHostId;
    }
    return false;
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
    if (hasRelayCycle(hostId, relayHostId, allHosts)) {
        return "relay_cycle";
    }
    return null;
}

function hopFromHost(
    relay: Host,
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
): RelayHopConfig {
    const creds = resolveHostCredentials(relay, keys, identities);
    return new RelayHopConfig({
        host: relay.host,
        port: relay.port > 0 ? relay.port : 22,
        username: creds.username,
        password: creds.password,
        privateKey: creds.privateKey,
    });
}

export function resolveRelaySessionFields(
    relayHostId: string | undefined,
    allHosts: Host[] | undefined,
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
): RelaySessionFields | undefined {
    if (!relayHostId || !allHosts) return undefined;

    const hops: RelayHopConfig[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = relayHostId;

    while (currentId) {
        if (visited.has(currentId)) break;
        visited.add(currentId);

        const relay = findRelayHost(currentId, allHosts);
        if (!relay || isBuiltinLocalhostHost(relay)) {
            return undefined;
        }

        hops.push(hopFromHost(relay, keys, identities));
        currentId = relay.relayHostId;
    }

    return hops.length > 0 ? { relayHops: hops } : undefined;
}

export function hostsToVerifyForSession(
    targetHost: string,
    targetPort: number,
    relayHops?: RelayHopConfig[],
): Array<{ host: string; port: number }> {
    const endpoints: Array<{ host: string; port: number }> = [];
    for (const hop of relayHops ?? []) {
        endpoints.push({
            host: hop.host,
            port: hop.port > 0 ? hop.port : 22,
        });
    }
    endpoints.push({
        host: targetHost,
        port: targetPort > 0 ? targetPort : 22,
    });
    return endpoints;
}
