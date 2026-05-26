import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Host } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { cn } from "@/lib/utils";

interface DraggableHostCardProps {
    host: Host;
    children: React.ReactNode;
}

export function DraggableHostCard({ host, children }: DraggableHostCardProps) {
    const { attributes, listeners, setNodeRef, transform, isDragging } =
        useDraggable({
            id: `host:${host.id}`,
            data: { type: "host", host },
        });

    const style = transform
        ? {
              transform: CSS.Translate.toString(transform),
          }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "touch-none",
                isDragging && "z-50 opacity-60",
            )}
            {...listeners}
            {...attributes}
        >
            {children}
        </div>
    );
}
