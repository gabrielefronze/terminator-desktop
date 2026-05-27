import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { SavedKey } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { resolveHostCredentials } from "@/lib/resolveHostCredentials";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import type { CreateSessionParams, SudoCredential } from "@/store/sessionStore";

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
    const sudoCredentials: SudoCredential[] = [];
    const seen = new Set<string>();
    const addCredential = (id: string, label: string, password?: string) => {
        if (!password) return;
        const key = `${label}::${password}`;
        if (seen.has(key)) return;
        seen.add(key);
        sudoCredentials.push({ id, label, password });
    };

    // Include login password used for SSH (host password or selected identity password).
    addCredential("login-password", "Login password", creds.password);

    // Include selected auth identity too, even if not added in auto list.
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

    // Include explicit extra sudo identities.
    for (const identityId of host.userpassIdentityIds ?? []) {
        const identity = identities?.find((item) => item.id === identityId);
        if (!identity) continue;
        addCredential(
            `identity:${identity.id}`,
            identity.name || identity.username,
            identity.password,
        );
    }

    return {
        host: host.host,
        port: host.port,
        username: creds.username,
        password: creds.password,
        privateKey: creds.privateKey,
        title: host.name || host.host,
        icon: host.icon,
        color: host.color,
        sudoCredentials,
    };
}
