import {
    ArrowLeftRight,
    Edit,
    MoreHorizontal,
    Play,
    Square,
    Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { HOST_CARD_SURFACE_CLASS } from "@/lib/hostAppearance";
import { formatForwardRoute } from "@/lib/savedForwardRuntime";
import { Host } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedForward } from "../../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { cn } from "@/lib/utils";

interface ForwardCardProps {
    forward: SavedForward;
    host?: Host;
    isRunning: boolean;
    isStarting: boolean;
    isStopping: boolean;
    onStart: (forward: SavedForward) => void;
    onStop: (forwardId: string) => void;
    onEdit: (forward: SavedForward) => void;
    onDelete: (forward: SavedForward) => void;
}

export function ForwardCard({
    forward,
    host,
    isRunning,
    isStarting,
    isStopping,
    onStart,
    onStop,
    onEdit,
    onDelete,
}: ForwardCardProps) {
    const { t } = useTranslation(["forwards", "common"]);

    const actionDisabled = isStarting || isStopping;
    const hostLabel = host?.name || host?.host || t("missing_host");

    return (
        <div
            className={cn(
                "group flex flex-row items-center justify-between rounded-xl transition-all",
                HOST_CARD_SURFACE_CLASS,
                "hover:border-primary/40 hover:shadow-md",
            )}
        >
            <div className="flex min-w-0 flex-1 items-center gap-4 p-5">
                <div className="relative shrink-0">
                    {host ? (
                        <HostIconBadge icon={host.icon} color={host.color} />
                    ) : (
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                            <ArrowLeftRight className="size-4 text-muted-foreground" />
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <h3 className="truncate font-semibold text-card-foreground">
                        {forward.name}
                    </h3>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                        {formatForwardRoute(forward)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {hostLabel}
                    </p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pr-4">
                <Button
                    type="button"
                    size="icon"
                    variant={isRunning ? "secondary" : "default"}
                    disabled={actionDisabled}
                    onClick={() =>
                        isRunning ? onStop(forward.id) : onStart(forward)
                    }
                    aria-label={
                        isRunning ? t("stop_forward") : t("start_forward")
                    }
                >
                    {isRunning ? (
                        <Square className="size-4" />
                    ) : (
                        <Play className="size-4" />
                    )}
                </Button>

                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="opacity-0 transition-opacity group-hover:opacity-100
                                       data-[state=open]:opacity-100 focus-visible:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreHorizontal className="size-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50 w-40">
                        <DropdownMenuItem onClick={() => onEdit(forward)}>
                            <Edit className="mr-2 size-4" />
                            {t("edit", { ns: "common" })}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(forward)}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                            <Trash2 className="mr-2 size-4" />
                            {t("delete", { ns: "common" })}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
