import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Columns2, X } from "lucide-react";
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
import { normalizeGroupColor } from "@/lib/hostAppearance";

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

export const terminalTabDragId = (sessionId: string) => `tab:${sessionId}`;
export const terminalTabDropId = (sessionId: string) => `tab-drop:${sessionId}`;

interface TerminalTabProps {
    session: TerminalSession;
    isActive: boolean;
    onClick: () => void;
    onClose: () => void;
    onCloseOthers: () => void;
    onCloseAll: () => void;
    enableDragDrop?: boolean;
    isDragOverlay?: boolean;
    splitExtraCount?: number;
    splitPartnerTitle?: string;
    displayTitle?: string;
    displayIcon?: string;
    displayColor?: string;
    isTabGroup?: boolean;
    onSaveTabGroup?: () => void;
    onRenameTabGroup?: () => void;
}

export function TerminalTab({
    session,
    isActive,
    onClick,
    onClose,
    onCloseOthers,
    onCloseAll,
    enableDragDrop = true,
    isDragOverlay = false,
    splitExtraCount = 0,
    splitPartnerTitle,
    displayTitle,
    displayIcon,
    displayColor,
    isTabGroup = false,
    onSaveTabGroup,
    onRenameTabGroup,
}: TerminalTabProps) {
    const state = isActive ? "active" : "inactive";
    const { t } = useTranslation(["common", "terminal", "tabgroups"]);
    const title = displayTitle ?? session.title;
    const icon = displayIcon ?? session.icon;
    const color = displayColor ?? session.color;
    const groupBorderColor = isTabGroup
        ? normalizeGroupColor(color)
        : undefined;

    const draggable = useDraggable({
        id: terminalTabDragId(session.id),
        data: { type: "tab", sessionId: session.id },
        disabled: !enableDragDrop || isDragOverlay,
    });

    const droppable = useDroppable({
        id: terminalTabDropId(session.id),
        data: { type: "tab-drop", sessionId: session.id },
        disabled: !enableDragDrop || isDragOverlay,
    });

    const setNodeRef = (node: HTMLDivElement | null) => {
        draggable.setNodeRef(node);
        droppable.setNodeRef(node);
    };

    const dragTransform =
        enableDragDrop && !isDragOverlay && draggable.transform
            ? CSS.Translate.toString(draggable.transform)
            : undefined;

    const style =
        dragTransform || groupBorderColor
            ? {
                  ...(dragTransform ? { transform: dragTransform } : {}),
                  ...(groupBorderColor
                      ? { borderColor: groupBorderColor }
                      : {}),
              }
            : undefined;

    const isDropTarget =
        enableDragDrop &&
        !isDragOverlay &&
        droppable.isOver &&
        !draggable.isDragging;

    const tabContent = (
        <div
            ref={enableDragDrop && !isDragOverlay ? setNodeRef : undefined}
            style={style}
            role="tab"
            tabIndex={0}
            aria-selected={isActive}
            title={
                enableDragDrop && !isDragOverlay
                    ? splitExtraCount > 0 && splitPartnerTitle
                        ? t("terminal:tab_split_tooltip", {
                              leader: title,
                              partner: splitPartnerTitle,
                          })
                        : t("terminal:tab_drag_to_split")
                    : undefined
            }
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={cn(
                tabStyles({ state }),
                enableDragDrop && !isDragOverlay && "touch-none",
                draggable.isDragging && "opacity-40",
                isDragOverlay && "cursor-grabbing shadow-md",
                isDropTarget && "ring-2 ring-primary ring-offset-1 ring-offset-background",
            )}
            {...(enableDragDrop && !isDragOverlay
                ? { ...draggable.listeners, ...draggable.attributes }
                : {})}
        >
            <HostIconBadge
                icon={icon}
                color={color}
                size="sm"
            />
            {isTabGroup && (
                <Columns2
                    className="size-3 shrink-0"
                    style={{ color: groupBorderColor }}
                    aria-hidden
                />
            )}
            <span className="min-w-0 flex-1 truncate">
                {title}
                {splitExtraCount > 0 && (
                    <span className="text-muted-foreground">{` + ${splitExtraCount}`}</span>
                )}
            </span>
            <button
                type="button"
                title={t("common:close", { defaultValue: "Close" })}
                aria-label={t("common:close", { defaultValue: "Close" })}
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
    );

    if (isDragOverlay) {
        return tabContent;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{tabContent}</ContextMenuTrigger>
            <ContextMenuContent className="w-40">
                <ContextMenuItem onClick={onClick}>
                    {isActive ? "✓ " : ""}
                    {t("common:select", { defaultValue: "Select" })}
                </ContextMenuItem>
                {onSaveTabGroup && (
                    <ContextMenuItem onClick={onSaveTabGroup}>
                        {t("tabgroups:save_tab_group")}
                    </ContextMenuItem>
                )}
                {onRenameTabGroup && (
                    <ContextMenuItem onClick={onRenameTabGroup}>
                        {t("tabgroups:rename_tab_group")}
                    </ContextMenuItem>
                )}
                {(onSaveTabGroup || onRenameTabGroup) && (
                    <ContextMenuSeparator />
                )}
                <ContextMenuItem
                    variant="destructive"
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                >
                    <X className="mr-2 size-4" />
                    {t("common:close", { defaultValue: "Close" })}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onCloseOthers}>
                    {t("common:close_others", { defaultValue: "Close others" })}
                </ContextMenuItem>
                <ContextMenuItem onClick={onCloseAll}>
                    {t("common:close_all", { defaultValue: "Close all" })}
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}
