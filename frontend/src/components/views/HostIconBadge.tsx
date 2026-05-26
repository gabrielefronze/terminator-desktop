import { cn } from "@/lib/utils";
import {
    HOST_ICONS,
    hostIconBadgeStyle,
    normalizeGroupColor,
    normalizeGroupIcon,
    normalizeHostColor,
    normalizeHostIcon,
} from "@/lib/hostAppearance";

interface HostIconBadgeProps {
    icon?: string | null;
    color?: string | null;
    size?: "sm" | "md";
    className?: string;
    iconClassName?: string;
    /** Host cards default to server/blue; groups default to folder/purple. */
    kind?: "host" | "group";
}

export function HostIconBadge({
    icon,
    color,
    size = "md",
    className,
    iconClassName,
    kind = "host",
}: HostIconBadgeProps) {
    const iconId = kind === "group" ? normalizeGroupIcon(icon) : normalizeHostIcon(icon);
    const resolvedColor =
        kind === "group" ? normalizeGroupColor(color) : normalizeHostColor(color);
    const Icon = HOST_ICONS[iconId];
    const style = hostIconBadgeStyle(resolvedColor);

    return (
        <div
            className={cn(
                "flex shrink-0 items-center justify-center",
                size === "sm"
                    ? "size-5 rounded"
                    : "size-10 rounded-lg",
                className,
            )}
            style={style}
        >
            <Icon
                className={cn(
                    size === "sm" ? "size-3" : "size-5",
                    iconClassName,
                )}
            />
        </div>
    );
}
