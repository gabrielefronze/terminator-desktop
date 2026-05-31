import { SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
import { SavedForward } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { parseAppError } from "@/lib/error";
import type { TerminalSession } from "@/store/sessionStore";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function findRemoteSessionForHost(
    sessions: TerminalSession[],
    hostId: string,
): TerminalSession | undefined {
    const matches = sessions.filter(
        (session) => session.hostId === hostId && !session.config.local,
    );
    return matches.find((session) => !session.forwardOnly) ?? matches[0];
}

export async function waitForRemoteSession(
    hostId: string,
    getSessions: () => TerminalSession[],
    timeoutMs = 60_000,
): Promise<TerminalSession> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        const session = findRemoteSessionForHost(getSessions(), hostId);
        if (session) {
            return session;
        }
        await sleep(200);
    }
    throw new Error("SSH session not available");
}

export async function startSavedForward(
    sessionId: string,
    forward: SavedForward,
): Promise<void> {
    const localHost = forward.localHost || "127.0.0.1";
    const remoteHost = forward.remoteHost || "127.0.0.1";

    for (let attempt = 0; attempt < 60; attempt++) {
        try {
            await SshService.StartLocalForward(
                sessionId,
                forward.id,
                localHost,
                forward.localPort,
                remoteHost,
                forward.remotePort,
            );
            return;
        } catch (error) {
            const appError = parseAppError(error);
            if (appError.code === "SSH_SESSION_NOT_FOUND") {
                await sleep(500);
                continue;
            }
            throw error;
        }
    }

    throw new Error("SSH session not ready");
}

export async function stopSavedForward(forwardId: string): Promise<void> {
    await SshService.StopPortForward(forwardId);
}

export function formatForwardRoute(forward: SavedForward): string {
    const localHost = forward.localHost || "127.0.0.1";
    const remoteHost = forward.remoteHost || "127.0.0.1";
    return `${localHost}:${forward.localPort} → ${remoteHost}:${forward.remotePort}`;
}

export function formatPortForwardRoute(forward: {
    localHost?: string;
    localPort: number;
    remoteHost?: string;
    remotePort: number;
}): string {
    const localHost = forward.localHost || "127.0.0.1";
    const remoteHost = forward.remoteHost || "127.0.0.1";
    return `${localHost}:${forward.localPort} → ${remoteHost}:${forward.remotePort}`;
}
