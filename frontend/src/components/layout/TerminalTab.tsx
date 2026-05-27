import { X } from "lucide-react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { TerminalSession } from "@/store/sessionStore";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTranslation } from "react-i18next";

const tabStyles = cva(
    "wails-no-drag group flex h-7 min-w-30 max-w-50 cursor-pointer items-center gap-2 rounded-md border px-2 text-xs font-medium transition-colors",
    {
        variants: {
            state: {
                active: "border-border bg-card text-foreground",
                inactive:
                    "border-border border-muted text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            },
        },
        defaultVariants: {
            state: "inactive",
        },
    }
);

const closeButtonStyles = cva(
    "ml-2 flex size-5 items-center justify-center rounded-sm opacity-0 transition-all hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100",
    {
        variants: {
            state: {
                active: "opacity-100",
                inactive: "opacity-0",
            },
        },
        defaultVariants: {
            state: "inactive",
        },
    }
);

interface TerminalTabProps {
    session: TerminalSession;
    isActive: boolean;
    onClick: () => void;
    onClose: () => void;
    onCloseOthers: () => void;
    onCloseAll: () => void;
}

export function TerminalTab({
    session,
    isActive,
    onClick,
    onClose,
    onCloseOthers,
    onCloseAll,
}: TerminalTabProps) {
    const state = isActive ? "active" : "inactive";
    const { t } = useTranslation("common");

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    role="tab"
                    tabIndex={0}
                    aria-selected={isActive}
                    onClick={onClick}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onClick();
                        }
                    }}
                    className={cn(tabStyles({ state }))}
                >
                    <HostIconBadge
                        icon={session.icon}
                        color={session.color}
                        size="sm"
                    />
                    <span className="min-w-0 flex-1 truncate">{session.title}</span>
                    <button
                        type="button"
                        title={t("close", { defaultValue: "Close" })}
                        aria-label={t("close", { defaultValue: "Close" })}
                        className={cn(closeButtonStyles({ state }))}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        <X className="size-3" />
                    </button>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-40">
                <ContextMenuItem onClick={onClick}>
                    {isActive ? "✓ " : ""}
                    {t("select", { defaultValue: "Select" })}
                </ContextMenuItem>
                <ContextMenuItem
                    variant="destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                >
                    <X className="mr-2 size-4" />
                    {t("close", { defaultValue: "Close" })}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onCloseOthers}>
                    {t("close_others", { defaultValue: "Close others" })}
                </ContextMenuItem>
                <ContextMenuItem onClick={onCloseAll}>
                    {t("close_all", { defaultValue: "Close all" })}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}