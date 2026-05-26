import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";

/** Must match backend DefaultLocalhostHostID. */
export const BUILTIN_LOCALHOST_HOST_ID =
    "a0000000-0000-4000-8000-000000000001";

export function isBuiltinLocalhostHost(host: Host): boolean {
    return host.id === BUILTIN_LOCALHOST_HOST_ID;
}

export function isLocalhostHostEnabled(
    showLocalhostHost: boolean | undefined,
): boolean {
    return showLocalhostHost !== false;
}

/** Saved vault entry overrides the built-in template. */
export function resolveLocalhostHost(
    hosts: Host[] | undefined,
    builtin: Host | null | undefined,
): Host | null {
    const saved = hosts?.find((h) => h.id === BUILTIN_LOCALHOST_HOST_ID);
    return saved ?? builtin ?? null;
}
