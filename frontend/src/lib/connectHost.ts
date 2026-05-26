import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { resolveHostCredentials } from "@/lib/resolveHostCredentials";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import type { CreateSessionParams } from "@/store/sessionStore";

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
        icon,
        color,
    };
}

export function buildSessionFromHost(
    host: Host,
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
): CreateSessionParams {
    if (isBuiltinLocalhostHost(host)) {
        return buildLocalShellSession(host.name, host.icon, host.color);
    }

    const creds = resolveHostCredentials(host, keys, identities);

    return {
        host: host.host,
        port: host.port,
        username: creds.username,
        password: creds.password,
        privateKey: creds.privateKey,
        title: host.name || host.host,
        icon: host.icon,
        color: host.color,
    };
}
