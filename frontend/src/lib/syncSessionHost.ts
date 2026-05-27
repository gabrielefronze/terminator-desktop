import type { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import {
    BUILTIN_LOCALHOST_HOST_ID,
    isBuiltinLocalhostHost,
} from "@/lib/defaultLocalhost";
import type { TerminalSession } from "@/store/sessionStore";

export function findHostForSession(
    session: TerminalSession,
    hosts: Host[],
): Host | undefined {
    if (session.hostId) {
        return hosts.find((host) => host.id === session.hostId);
    }

    if (session.config.local) {
        return hosts.find((host) => host.id === BUILTIN_LOCALHOST_HOST_ID);
    }

    return hosts.find(
        (host) =>
            !isBuiltinLocalhostHost(host) &&
            host.host === session.config.host &&
            host.port === session.config.port,
    );
}

export function sessionAppearanceFromHost(
    session: TerminalSession,
    host: Host,
): Pick<TerminalSession, "hostId" | "icon" | "color" | "title"> {
    return {
        hostId: host.id,
        icon: host.icon,
        color: host.color,
        title: host.name || host.host,
    };
}

export function sessionAppearanceChanged(
    session: TerminalSession,
    next: Pick<TerminalSession, "hostId" | "icon" | "color" | "title">,
): boolean {
    return (
        session.hostId !== next.hostId ||
        session.icon !== next.icon ||
        session.color !== next.color ||
        session.title !== next.title
    );
}
