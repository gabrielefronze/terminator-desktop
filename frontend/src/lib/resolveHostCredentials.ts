import {
    Host,
    SavedKey,
    SavedIdentity,
} from "../../bindings/terminator-desktop/backend/internal/services/blob";

export interface ResolvedHostCredentials {
    username: string;
    password?: string;
    privateKey?: string;
}

export function resolveHostCredentials(
    host: Host,
    keys: SavedKey[] | undefined,
    identities: SavedIdentity[] | undefined,
): ResolvedHostCredentials {
    if (host.keyId && keys) {
        const foundKey = keys.find((k) => k.id === host.keyId);
        if (foundKey) {
            return {
                username: host.username,
                privateKey: foundKey.privateKey,
            };
        }
    }

    if (host.identityId && identities) {
        const foundIdentity = identities.find((i) => i.id === host.identityId);
        if (foundIdentity) {
            return {
                username: foundIdentity.username,
                password: foundIdentity.password,
            };
        }
    }

    return {
        username: host.username,
        password: host.password || undefined,
    };
}
