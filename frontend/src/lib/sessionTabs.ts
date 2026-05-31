import type { TerminalSession } from "@/store/sessionStore";
import {
    collectTileSessionIds,
    getTileExtraCount,
    isTileMother,
    resolveTileRoot,
} from "@/lib/tileLayout";

export function isSplitMother(session: TerminalSession): boolean {
    return isTileMother(session);
}

export function getSplitPartner(
    session: TerminalSession,
    sessions: TerminalSession[],
): TerminalSession | undefined {
    const root = resolveTileRoot(session, sessions);
    if (!root) return undefined;

    const memberIds = collectTileSessionIds(root);
    if (memberIds.length <= 1) return undefined;

    const partnerId = memberIds.find((id) => id !== session.id);
    if (!partnerId) return undefined;
    return sessions.find((candidate) => candidate.id === partnerId);
}

export function getTitleBarSessions(
    sessions: TerminalSession[],
): TerminalSession[] {
    return sessions.filter((session) => !session.splitMotherId);
}

export function getSplitExtraCount(
    session: TerminalSession,
    sessions: TerminalSession[],
): number {
    return getTileExtraCount(session, sessions);
}

export function isSplitGroupActive(
    leader: TerminalSession,
    activeSessionId: string | null,
    sessions: TerminalSession[] = [],
): boolean {
    if (!activeSessionId) return false;
    if (leader.id === activeSessionId) return true;

    const root = resolveTileRoot(leader, sessions);
    if (!root) return false;
    return collectTileSessionIds(root).includes(activeSessionId);
}

export function isSessionInTileGroup(
    session: TerminalSession,
    sessions: TerminalSession[],
    sessionId: string,
): boolean {
    const root = resolveTileRoot(session, sessions);
    if (!root) return session.id === sessionId;
    return collectTileSessionIds(root).includes(sessionId);
}

export function getTileGroupSessionIds(
    session: TerminalSession,
    sessions: TerminalSession[],
): string[] {
    const root = resolveTileRoot(session, sessions);
    if (!root) return [session.id];
    return collectTileSessionIds(root);
}
