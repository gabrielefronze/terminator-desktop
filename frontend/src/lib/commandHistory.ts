import { Service as CommandHistoryService } from "../../bindings/terminator-desktop/backend/internal/services/commandhistory";
import type { Entry } from "../../bindings/terminator-desktop/backend/internal/services/commandhistory";
import { SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
import { BUILTIN_LOCALHOST_HOST_ID } from "@/lib/defaultLocalhost";
import type { TerminalSession } from "@/store/sessionStore";

export type CommandHistoryScope = "global" | "local";

export function sessionHistoryHostId(session: TerminalSession): string {
    if (session.hostId) {
        return session.hostId;
    }
    if (session.config.local) {
        return BUILTIN_LOCALHOST_HOST_ID;
    }
    return "";
}

export function sessionHistoryHostLabel(session: TerminalSession): string {
    return session.title || session.config.host || "Session";
}

export async function appendCommandHistory(
    hostId: string,
    hostLabel: string,
    command: string,
): Promise<void> {
    if (!hostId || !command.trim()) {
        return;
    }
    try {
        await CommandHistoryService.Append(hostId, hostLabel, command);
    } catch (error) {
        console.error("command history append failed", error);
    }
}

export async function searchCommandHistory(
    query: string,
    scope: CommandHistoryScope,
    hostId: string,
    limit = 40,
): Promise<Entry[]> {
    const scopeArg = scope === "local" ? "local" : "global";
    return CommandHistoryService.Search(query, scopeArg, hostId, limit);
}

export async function applyCommandToSessions(
    sessionIds: string[],
    command: string,
): Promise<void> {
    if (sessionIds.length === 0) {
        return;
    }
    const payload = command.endsWith("\r") ? command : `${command}\r`;
    await Promise.all(sessionIds.map((id) => SshService.Input(id, payload)));
}
