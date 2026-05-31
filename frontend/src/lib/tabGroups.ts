import type { Host, TabGroup } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import type { TerminalSession } from "@/store/sessionStore";
import { BUILTIN_LOCALHOST_HOST_ID } from "@/lib/defaultLocalhost";

export function sessionHostId(session: TerminalSession): string | undefined {
    if (session.hostId) {
        return session.hostId;
    }
    if (session.config.local) {
        return BUILTIN_LOCALHOST_HOST_ID;
    }
    return undefined;
}

export function resolveTabGroupHosts(
    tabGroup: TabGroup,
    allHosts: Host[],
): Host[] {
    return tabGroup.hostIds
        .map((hostId) => allHosts.find((host) => host.id === hostId))
        .filter((host): host is Host => host != null);
}

function orderedHostIds(hostIds: Array<string | undefined>): string[] {
    return hostIds.filter((hostId): hostId is string => Boolean(hostId));
}

export function collectHostIdsFromSplit(
    mother: TerminalSession,
    partner: TerminalSession,
): string[] {
    const motherHostId = sessionHostId(mother);
    const partnerHostId = sessionHostId(partner);

    if (partner.config.local) {
        return orderedHostIds([partnerHostId, motherHostId]);
    }
    if (mother.config.local) {
        return orderedHostIds([motherHostId, partnerHostId]);
    }
    return orderedHostIds([motherHostId, partnerHostId]);
}

export function defaultTabGroupFromSplit(
    mother: TerminalSession,
    partner: TerminalSession,
): Partial<TabGroup> {
    return {
        name: mother.title,
        hostIds: collectHostIdsFromSplit(mother, partner),
        icon: mother.icon,
        color: mother.color,
    };
}

export function tabGroupById(
    tabGroups: TabGroup[] | undefined,
): Map<string, TabGroup> {
    return new Map((tabGroups ?? []).map((group) => [group.id, group]));
}

export function formatTabGroupHostList(hosts: Host[]): string {
    return hosts.map((host) => host.name || host.host).join(" · ");
}
