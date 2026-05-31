import { SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
import { getTileGroupSessionIds } from "@/lib/sessionTabs";
import type { TerminalSession } from "@/store/sessionStore";

export function resolveSnippetTargetSessionIds(
    sessions: TerminalSession[],
    activeSessionId: string | null,
    broadcastEnabled: boolean,
): string[] {
    if (!activeSessionId) {
        return [];
    }

    const activeSession = sessions.find(
        (session) => session.id === activeSessionId,
    );
    if (!activeSession || activeSession.config.local) {
        return [];
    }

    if (broadcastEnabled) {
        const groupIds = getTileGroupSessionIds(activeSession, sessions);
        if (groupIds.length > 1) {
            return groupIds.filter((id) => {
                const session = sessions.find((item) => item.id === id);
                return session && !session.config.local;
            });
        }
    }

    return [activeSessionId];
}

export function resolveBroadcastInputTargetSessionIds(
    sourceSessionId: string,
    sessions: TerminalSession[],
    broadcastEnabled: boolean,
): string[] {
    const sourceSession = sessions.find(
        (session) => session.id === sourceSessionId,
    );
    if (!sourceSession) {
        return [sourceSessionId];
    }

    if (!broadcastEnabled) {
        return [sourceSessionId];
    }

    const groupIds = getTileGroupSessionIds(sourceSession, sessions);
    return groupIds.length > 1 ? groupIds : [sourceSessionId];
}

export async function applySnippetContent(
    sessionIds: string[],
    content: string,
): Promise<void> {
    if (sessionIds.length === 0) {
        return;
    }

    const payload = content.endsWith("\n") ? content : `${content}\n`;
    await Promise.all(sessionIds.map((id) => SshService.Input(id, payload)));
}
