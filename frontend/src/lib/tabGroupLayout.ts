import type { TabGroup } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import type { TerminalSession } from "@/store/sessionStore";
import {
    buildHorizontalTileChain,
    collectTileSessionIds,
    resolveTileRoot,
    tileLeaf,
    tileSplit,
    type TileDirection,
    type TileNode,
} from "@/lib/tileLayout";
import { sessionHostId } from "@/lib/tabGroups";

export type SavedTileNode =
    | { kind: "leaf"; hostIndex: number }
    | {
          kind: "split";
          direction: TileDirection;
          first: SavedTileNode;
          second: SavedTileNode;
      };

export type TabGroupLayout = {
    hostIds: string[];
    tileLayout: SavedTileNode | undefined;
};

export function serializeTabGroupFromSessions(
    leader: TerminalSession,
    sessions: TerminalSession[],
): TabGroupLayout {
    const root = resolveTileRoot(leader, sessions);
    if (!root) {
        const hostId = sessionHostId(leader);
        return {
            hostIds: hostId ? [hostId] : [],
            tileLayout: undefined,
        };
    }

    const leafSessionIds = collectTileSessionIds(root);
    const orderedSessionIds = [
        leader.id,
        ...leafSessionIds.filter((sessionId) => sessionId !== leader.id),
    ];
    const hostIds = orderedSessionIds.map((sessionId) => {
        const session = sessions.find((item) => item.id === sessionId);
        return session ? sessionHostId(session) ?? "" : "";
    });

    const toSaved = (node: TileNode): SavedTileNode => {
        if (node.kind === "leaf") {
            return {
                kind: "leaf",
                hostIndex: orderedSessionIds.indexOf(node.sessionId),
            };
        }

        return {
            kind: "split",
            direction: node.direction,
            first: toSaved(node.first),
            second: toSaved(node.second),
        };
    };

    return {
        hostIds,
        tileLayout:
            leafSessionIds.length >= 2 ? toSaved(root) : undefined,
    };
}

export function deserializeTileLayout(
    layout: SavedTileNode | undefined | null,
    sessionIds: string[],
): TileNode | null {
    if (sessionIds.length === 0) {
        return null;
    }

    if (sessionIds.length === 1) {
        return tileLeaf(sessionIds[0]);
    }

    if (!layout) {
        return buildHorizontalTileChain(sessionIds);
    }

    const toRuntime = (node: SavedTileNode): TileNode => {
        if (node.kind === "leaf") {
            const sessionId = sessionIds[node.hostIndex];
            if (!sessionId) {
                return tileLeaf(sessionIds[0]);
            }
            return tileLeaf(sessionId);
        }

        return tileSplit(
            node.direction,
            toRuntime(node.first),
            toRuntime(node.second),
        );
    };

    return toRuntime(layout);
}

export function tabGroupTileLayout(
    tabGroup: TabGroup,
): SavedTileNode | undefined {
    const layout = tabGroup.tileLayout as SavedTileNode | undefined;
    if (!layout || (layout.kind !== "leaf" && layout.kind !== "split")) {
        return undefined;
    }
    return layout;
}

export function defaultTabGroupFromTileSessions(
    leader: TerminalSession,
    sessions: TerminalSession[],
): Partial<TabGroup> {
    const { hostIds, tileLayout } = serializeTabGroupFromSessions(
        leader,
        sessions,
    );

    return {
        name: leader.title,
        hostIds,
        tileLayout: tileLayout as TabGroup["tileLayout"],
        icon: leader.icon,
        color: leader.color,
    };
}
