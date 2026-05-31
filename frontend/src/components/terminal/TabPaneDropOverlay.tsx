import { cn } from "@/lib/utils";
import type { TileDropZone } from "@/lib/tileLayout";

const zoneLayout: Record<TileDropZone, string> = {
    left: "left-0 top-0 h-full w-1/2",
    right: "right-0 top-0 h-full w-1/2",
    top: "left-0 top-0 h-1/2 w-full",
    bottom: "left-0 bottom-0 h-1/2 w-full",
};

interface TabPaneDropOverlayProps {
    zone: TileDropZone | null;
    color: string;
    visible: boolean;
}

export function TabPaneDropOverlay({
    zone,
    color,
    visible,
}: TabPaneDropOverlayProps) {
    if (!visible || !zone) {
        return null;
    }

    return (
        <div className="pointer-events-none absolute inset-0 z-20">
            <div
                className={cn("absolute border-2", zoneLayout[zone])}
                style={{
                    backgroundColor: `color-mix(in srgb, ${color} 28%, transparent)`,
                    borderColor: color,
                }}
            />
        </div>
    );
}
