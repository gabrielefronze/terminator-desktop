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
    return sessions.filter(
        (session) => !session.splitMotherId && !session.forwardOnly,
    );
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

/** Title-bar tab that owns the active pane (or the active tab itself). */
export function resolveTitleBarLeaderId(
    sessions: TerminalSession[],
    activeSessionId: string | null,
): string | null {
    const titleBar = getTitleBarSessions(sessions);
    if (titleBar.length === 0) {
        return null;
    }
    if (!activeSessionId) {
        return titleBar[0].id;
    }

    const active = sessions.find((session) => session.id === activeSessionId);
    if (!active) {
        return titleBar[0].id;
    }

    if (active.splitMotherId) {
        return active.splitMotherId;
    }

    if (!active.forwardOnly) {
        return active.id;
    }

    return titleBar[0]?.id ?? null;
}

export function getAdjacentTitleBarSessionId(
    sessions: TerminalSession[],
    activeSessionId: string | null,
    direction: "next" | "prev",
): string | null {
    const titleBar = getTitleBarSessions(sessions);
    if (titleBar.length === 0) {
        return null;
    }

    const leaderId = resolveTitleBarLeaderId(sessions, activeSessionId);
    let index = titleBar.findIndex((session) => session.id === leaderId);
    if (index < 0) {
        index = 0;
    }

    const delta = direction === "next" ? 1 : -1;
    const nextIndex =
        (index + delta + titleBar.length) % titleBar.length;
    return titleBar[nextIndex]?.id ?? null;
}

export function closeTitleBarTab(
    sessions: TerminalSession[],
    leaderId: string,
    removeSession: (id: string) => void,
    closeTileGroup: (id: string) => void,
): void {
    const leader = sessions.find((session) => session.id === leaderId);
    if (!leader) {
        return;
    }

    const paneCount = getTileGroupSessionIds(leader, sessions).length;
    if (paneCount > 1) {
        closeTileGroup(leader.id);
        return;
    }

    removeSession(leader.id);
}
