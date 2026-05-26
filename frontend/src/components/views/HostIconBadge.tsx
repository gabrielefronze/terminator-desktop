import { cn } from "@/lib/utils";
import { hostIconBadgeStyle, resolveHostIcon } from "@/lib/hostAppearance";

interface HostIconBadgeProps {
    icon?: string | null;
    color?: string | null;
    size?: "sm" | "md";
    className?: string;
    iconClassName?: string;
}

export function HostIconBadge({
    icon,
    color,
    size = "md",
    className,
    iconClassName,
}: HostIconBadgeProps) {
    const Icon = resolveHostIcon(icon);
    const style = hostIconBadgeStyle(color);

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
