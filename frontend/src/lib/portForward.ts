export type PortForwardMode = "local" | "remote";

export function normalizeForwardMode(mode?: string): PortForwardMode {
    return mode === "remote" ? "remote" : "local";
}

export function formatForwardRoute(forward: {
    mode?: string;
    localHost?: string;
    localPort: number;
    remoteHost?: string;
    remotePort: number;
}): string {
    const localHost = forward.localHost || "127.0.0.1";
    const remoteHost = forward.remoteHost || "127.0.0.1";
    const local = `${localHost}:${forward.localPort}`;
    const remote = `${remoteHost}:${forward.remotePort}`;
    return normalizeForwardMode(forward.mode) === "remote"
        ? `${remote} → ${local}`
        : `${local} → ${remote}`;
}
