import { normalizeHostTags } from "@/lib/hostSearch";
import { cn } from "@/lib/utils";

interface HostTagListProps {
    tags: string[] | undefined;
    className?: string;
    maxVisible?: number;
}

export function HostTagList({
    tags,
    className,
    maxVisible = 4,
}: HostTagListProps) {
    const normalized = normalizeHostTags(tags);
    if (normalized.length === 0) {
        return null;
    }

    const visible = normalized.slice(0, maxVisible);
    const overflow = normalized.length - visible.length;

    return (
        <div className={cn("flex flex-wrap gap-1", className)}>
            {visible.map((tag) => (
                <span
                    key={tag}
                    className="rounded-md bg-muted/80 px-1.5 py-0 text-[10px] font-medium leading-4 text-muted-foreground"
                >
                    {tag}
                </span>
            ))}
            {overflow > 0 ? (
                <span className="text-[10px] leading-4 text-muted-foreground">
                    +{overflow}
                </span>
            ) : null}
        </div>
    );
}
