import type { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";

export type HostLinkRole = "auth" | "auto_password" | "key";

export interface HostLink {
    host: Host;
    roles: HostLinkRole[];
}

export function formatHostLabel(host: Host): string {
    return host.name?.trim() || host.host || "Host";
}

export function getHostsForIdentity(
    hosts: Host[],
    identityId: string,
): HostLink[] {
    const links: HostLink[] = [];

    for (const host of hosts) {
        const roles: HostLinkRole[] = [];
        if (host.identityId === identityId) {
            roles.push("auth");
        }
        if (host.userpassIdentityIds?.includes(identityId)) {
            roles.push("auto_password");
        }
        if (roles.length > 0) {
            links.push({ host, roles });
        }
    }

    links.sort((a, b) =>
        formatHostLabel(a.host).localeCompare(formatHostLabel(b.host)),
    );
    return links;
}

export function getHostsForKey(hosts: Host[], keyId: string): Host[] {
    return hosts
        .filter((host) => host.keyId === keyId)
        .sort((a, b) =>
            formatHostLabel(a).localeCompare(formatHostLabel(b)),
        );
}

export function isIdentityUsedByHosts(hosts: Host[], identityId: string): boolean {
    return getHostsForIdentity(hosts, identityId).length > 0;
}

export function isKeyUsedByHosts(hosts: Host[], keyId: string): boolean {
    return getHostsForKey(hosts, keyId).length > 0;
}
