import {
    Snapshot,
    Tab,
} from "../../bindings/terminator-desktop/backend/internal/services/sessionrestore";
import type { TerminalSession } from "@/store/sessionStore";
import { getTitleBarSessions } from "@/lib/sessionTabs";
import { sessionHostId } from "@/lib/tabGroups";
import {
    serializeTabGroupFromSessions,
    type SavedTileNode,
} from "@/lib/tabGroupLayout";
import { getTileGroupSessionIds } from "@/lib/sessionTabs";

export function buildSessionRestoreSnapshot(
    sessions: TerminalSession[],
    activeSessionId: string | null,
): Snapshot {
    const leaders = getTitleBarSessions(sessions);
    const tabs: Tab[] = leaders.map((leader) => {
        const { hostIds, tileLayout } = serializeTabGroupFromSessions(
            leader,
            sessions,
        );
        return new Tab({
            hostIds: hostIds.filter(Boolean),
            tileLayout: tileLayout as Tab["tileLayout"],
            tabGroupId: leader.tabGroupId ?? "",
        });
    });

    let activeTabIndex = 0;
    let activeHostId = "";

    if (activeSessionId) {
        for (let index = 0; index < leaders.length; index++) {
            const leader = leaders[index];
            const memberIds = getTileGroupSessionIds(leader, sessions);
            if (!memberIds.includes(activeSessionId)) {
                continue;
            }
            activeTabIndex = index;
            const activeSession = sessions.find(
                (session) => session.id === activeSessionId,
            );
            activeHostId = activeSession
                ? (sessionHostId(activeSession) ?? "")
                : "";
            break;
        }
    }

    return new Snapshot({
        version: 1,
        tabs,
        activeTabIndex,
        activeHostId,
    });
}

export function savedTileNodeFromTab(
    tileLayout: Tab["tileLayout"],
): SavedTileNode | undefined {
    if (!tileLayout) {
        return undefined;
    }
    const node = tileLayout as SavedTileNode;
    if (node.kind !== "leaf" && node.kind !== "split") {
        return undefined;
    }
    return node;
}
