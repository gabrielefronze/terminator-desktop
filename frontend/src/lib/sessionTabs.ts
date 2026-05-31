import type { TerminalSession } from "@/store/sessionStore";

export function isSplitMother(session: TerminalSession): boolean {
    return Boolean(session.splitPartnerId && !session.splitMotherId);
}

export function getSplitPartner(
    session: TerminalSession,
    sessions: TerminalSession[],
): TerminalSession | undefined {
    if (!session.splitPartnerId) return undefined;
    return sessions.find((candidate) => candidate.id === session.splitPartnerId);
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
    if (!isSplitMother(session)) return 0;
    return getSplitPartner(session, sessions) ? 1 : 0;
}

export function isSplitGroupActive(
    leader: TerminalSession,
    activeSessionId: string | null,
): boolean {
    if (!activeSessionId) return false;
    if (leader.id === activeSessionId) return true;
    return leader.splitPartnerId === activeSessionId;
}
