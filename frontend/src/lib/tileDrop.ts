import type { TileDropZone } from "@/lib/tileLayout";

export const terminalPaneDropId = (sessionId: string) =>
    `pane-drop:${sessionId}`;

export function resolveDropZone(
    rect: { top: number; left: number; width: number; height: number },
    clientX: number,
    clientY: number,
): TileDropZone {
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;

    if (Math.abs(relX - 0.5) > Math.abs(relY - 0.5)) {
        return relX < 0.5 ? "left" : "right";
    }

    return relY < 0.5 ? "top" : "bottom";
}
