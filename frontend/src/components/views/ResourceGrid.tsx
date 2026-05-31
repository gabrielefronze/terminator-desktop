import { cn } from "@/lib/utils";
import {
    RESOURCE_GRID_ITEM_CLASS,
    RESOURCE_TILE_GRID_CLASS,
} from "@/lib/resourceLayout";

export function ResourceGrid({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(RESOURCE_TILE_GRID_CLASS, className)}>{children}</div>
    );
}

export function ResourceGridItem({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn(RESOURCE_GRID_ITEM_CLASS, className)}>{children}</div>
    );
}
