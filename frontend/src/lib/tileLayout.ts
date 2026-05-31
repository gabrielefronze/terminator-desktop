import type { TerminalSession } from "@/store/sessionStore";

export type TileDirection = "horizontal" | "vertical";

export type TileNode =
    | { kind: "leaf"; sessionId: string }
    | {
          kind: "split";
          direction: TileDirection;
          first: TileNode;
          second: TileNode;
      };

export const MAX_TILE_PANES = 16;

export function tileLeaf(sessionId: string): TileNode {
    return { kind: "leaf", sessionId };
}

export function tileSplit(
    direction: TileDirection,
    first: TileNode,
    second: TileNode,
): TileNode {
    return { kind: "split", direction, first, second };
}

export function collectTileSessionIds(node: TileNode): string[] {
    if (node.kind === "leaf") {
        return [node.sessionId];
    }
    return [
        ...collectTileSessionIds(node.first),
        ...collectTileSessionIds(node.second),
    ];
}

export function tileContainsSession(
    node: TileNode,
    sessionId: string,
): boolean {
    if (node.kind === "leaf") {
        return node.sessionId === sessionId;
    }
    return (
        tileContainsSession(node.first, sessionId) ||
        tileContainsSession(node.second, sessionId)
    );
}

function mapTileTree(
    node: TileNode,
    mapper: (node: TileNode) => TileNode | null,
): TileNode | null {
    const mapped = mapper(node);
    if (!mapped) return null;

    if (mapped.kind === "leaf") {
        return mapped;
    }

    const first = mapTileTree(mapped.first, mapper);
    const second = mapTileTree(mapped.second, mapper);

    if (!first && !second) return null;
    if (!first) return second;
    if (!second) return first;

    return { ...mapped, first, second };
}

export function removeSessionFromTile(
    root: TileNode,
    sessionId: string,
): TileNode | null {
    return mapTileTree(root, (node) => {
        if (node.kind === "leaf" && node.sessionId === sessionId) {
            return null;
        }
        return node;
    });
}

export type TileDropZone = "left" | "right" | "top" | "bottom";

export function dropZoneToDirection(zone: TileDropZone): TileDirection {
    return zone === "left" || zone === "right" ? "horizontal" : "vertical";
}

export function insertSessionIntoTile(
    root: TileNode,
    targetSessionId: string,
    newSessionId: string,
    zone: TileDropZone,
): TileNode {
    const direction = dropZoneToDirection(zone);
    const newLeaf = tileLeaf(newSessionId);

    const replaceTarget = (node: TileNode): TileNode => {
        if (node.kind === "leaf" && node.sessionId === targetSessionId) {
            const [first, second] =
                zone === "left" || zone === "top"
                    ? [newLeaf, node]
                    : [node, newLeaf];
            return tileSplit(direction, first, second);
        }

        if (node.kind === "split") {
            return {
                ...node,
                first: replaceTarget(node.first),
                second: replaceTarget(node.second),
            };
        }

        return node;
    };

    return replaceTarget(root);
}

export function resolveTileMother(
    session: TerminalSession,
    sessions: TerminalSession[],
): TerminalSession {
    if (session.splitMotherId) {
        return (
            sessions.find((candidate) => candidate.id === session.splitMotherId) ??
            session
        );
    }
    return session;
}

export function resolveTileRoot(
    session: TerminalSession,
    sessions: TerminalSession[],
): TileNode | null {
    const mother = resolveTileMother(session, sessions);
    if (mother.tileRoot) {
        return mother.tileRoot;
    }

    if (mother.splitPartnerId) {
        const partner = sessions.find(
            (candidate) => candidate.id === mother.splitPartnerId,
        );
        if (!partner) {
            return tileLeaf(mother.id);
        }

        const ordered =
            mother.config.local && !partner.config.local
                ? [partner, mother]
                : !mother.config.local && partner.config.local
                  ? [mother, partner]
                  : [mother, partner];

        return tileSplit(
            "horizontal",
            tileLeaf(ordered[0].id),
            tileLeaf(ordered[1].id),
        );
    }

    if (mother.id === session.id && !session.splitMotherId) {
        return tileLeaf(session.id);
    }

    return null;
}

export function isTileMother(session: TerminalSession): boolean {
    return Boolean(
        session.tileRoot ||
            (session.splitPartnerId && !session.splitMotherId),
    );
}

export function getTileExtraCount(
    session: TerminalSession,
    sessions: TerminalSession[],
): number {
    const root = resolveTileRoot(session, sessions);
    if (!root) return 0;
    return Math.max(0, collectTileSessionIds(root).length - 1);
}

export function buildHorizontalTileChain(sessionIds: string[]): TileNode {
    let root = tileLeaf(sessionIds[0]);
    for (let index = 1; index < sessionIds.length; index += 1) {
        root = tileSplit("horizontal", root, tileLeaf(sessionIds[index]));
    }
    return root;
}

export type PercentRect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

export function collectTilePaneRects(
    node: TileNode,
    rect: PercentRect = { top: 0, left: 0, width: 100, height: 100 },
): Map<string, PercentRect> {
    const out = new Map<string, PercentRect>();

    const walk = (current: TileNode, bounds: PercentRect) => {
        if (current.kind === "leaf") {
            out.set(current.sessionId, bounds);
            return;
        }

        if (current.direction === "horizontal") {
            const halfWidth = bounds.width / 2;
            walk(current.first, { ...bounds, width: halfWidth });
            walk(current.second, {
                ...bounds,
                left: bounds.left + halfWidth,
                width: halfWidth,
            });
            return;
        }

        const halfHeight = bounds.height / 2;
        walk(current.first, { ...bounds, height: halfHeight });
        walk(current.second, {
            ...bounds,
            top: bounds.top + halfHeight,
            height: halfHeight,
        });
    };

    walk(node, rect);
    return out;
}

export function percentRectToStyle(rect: PercentRect): {
    top: string;
    left: string;
    width: string;
    height: string;
} {
    return {
        top: `${rect.top}%`,
        left: `${rect.left}%`,
        width: `${rect.width}%`,
        height: `${rect.height}%`,
    };
}

export const TILE_PANE_GAP_PX = 4;

export function tilePaneStyle(rect: PercentRect): {
    top: string;
    left: string;
    width: string;
    height: string;
} {
    const gap = TILE_PANE_GAP_PX;
    return {
        top: `calc(${rect.top}% + ${gap}px)`,
        left: `calc(${rect.left}% + ${gap}px)`,
        width: `calc(${rect.width}% - ${gap * 2}px)`,
        height: `calc(${rect.height}% - ${gap * 2}px)`,
    };
}
