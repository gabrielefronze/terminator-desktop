import { HOST_CARD_SURFACE_CLASS } from "@/lib/hostAppearance";
import { cn } from "@/lib/utils";

/** CSS class names (defined in main.css — not Tailwind utilities). */
export const RESOURCE_TILE_GRID_CLASS = "resource-tile-grid";
export const RESOURCE_GRID_ITEM_CLASS = "resource-grid-item";

/** Row card shell shared by host-style list tiles. */
export const RESOURCE_ROW_CARD_CLASS =
    "group flex w-full min-w-0 flex-row items-center justify-between rounded-xl transition-all";

/** Row card surface + hover/focus chrome. */
export const RESOURCE_ROW_CARD_SURFACE_CLASS = cn(
    RESOURCE_ROW_CARD_CLASS,
    HOST_CARD_SURFACE_CLASS,
    "hover:border-primary/40 hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);

/** Primary (clickable) body inside a row card. */
export const RESOURCE_ROW_CARD_BODY_CLASS =
    "flex min-w-0 flex-1 cursor-pointer items-center gap-4 p-5 text-left";

/** Title + subtitle stack inside a row card. */
export const RESOURCE_ROW_CARD_TEXT_CLASS = "flex min-w-0 flex-col pr-4";

/** Trailing actions column inside a row card. */
export const RESOURCE_ROW_CARD_ACTIONS_CLASS = "flex shrink-0 items-center pr-4";
