import { useState, type ReactNode } from "react";
import {
    ChevronDown,
    ChevronRight,
    MoreHorizontal,
    Edit,
    Trash2,
    FolderOpen,
} from "lucide-react";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import {
    GROUP_CARD_SURFACE_CLASS,
    groupIconBadgeStyle,
    normalizeGroupColor,
} from "@/lib/hostAppearance";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Host, HostGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { HostTreeNode } from "@/lib/hostTree";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { RESOURCE_GRID_ITEM_CLASS, RESOURCE_TILE_GRID_CLASS } from "@/lib/resourceLayout";
import { useDroppable } from "@dnd-kit/core";

function GroupMenuItems({
    group,
    onEditGroup,
    onDeleteGroup,
    Item,
    Separator,
}: {
    group: HostGroup;
    onEditGroup: (group: HostGroup) => void;
    onDeleteGroup: (group: HostGroup) => void;
    Item: typeof ContextMenuItem | typeof DropdownMenuItem;
    Separator: typeof ContextMenuSeparator | typeof DropdownMenuSeparator;
}) {
    const { t } = useTranslation(["hosts", "common"]);

    return (
        <>
            <Item onClick={() => onEditGroup(group)}>
                <Edit className="mr-2 size-4" />
                {t("edit_group")}
            </Item>
            <Separator />
            <Item
                variant="destructive"
                onClick={() => onDeleteGroup(group)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
                <Trash2 className="mr-2 size-4" />
                {t("delete_group")}
            </Item>
        </>
    );
}

function countHostsInNode(node: HostTreeNode): number {
    return (
        node.hosts.length +
        node.children.reduce((sum, child) => sum + countHostsInNode(child), 0)
    );
}

function HostCountBadge({ count }: { count: number }) {
    const { t } = useTranslation("hosts");
    const label =
        count === 1
            ? t("host_count_one", { defaultValue: "1 host" })
            : t("host_count", { count });

    return (
        <span
            className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5
                       text-2xs font-medium text-muted-foreground"
        >
            {label}
        </span>
    );
}

interface SectionHeaderProps {
    accentColor: string;
    expanded: boolean;
    onToggle: () => void;
    icon: ReactNode;
    title: string;
    hostCount: number;
    menu?: ReactNode;
    contextMenu?: ReactNode;
}

function SectionHeader({
    accentColor,
    expanded,
    onToggle,
    icon,
    title,
    hostCount,
    menu,
    contextMenu,
}: SectionHeaderProps) {
    const header = (
        <div
            className={cn(
                "flex items-center gap-2 rounded-xl border border-border/60 px-2 py-2",
                GROUP_CARD_SURFACE_CLASS,
                "shadow-sm",
            )}
        >
            <div
                className="w-1 shrink-0 self-stretch rounded-full"
                style={{ backgroundColor: accentColor }}
                aria-hidden
            />
            <button
                type="button"
                onClick={onToggle}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-0.5 text-left
                           hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2
                           focus-visible:ring-ring"
            >
                {expanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                {icon}
                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate font-semibold text-foreground">
                        {title}
                    </span>
                    <HostCountBadge count={hostCount} />
                </div>
            </button>
            {menu}
        </div>
    );

    if (!contextMenu) {
        return header;
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>{header}</ContextMenuTrigger>
            {contextMenu}
        </ContextMenu>
    );
}

interface HostGroupSectionProps {
    node: HostTreeNode;
    nested?: boolean;
    onConnect: (host: Host) => void;
    onSplitWithLocal?: (host: Host) => void;
    onEditHost: (host: Host) => void;
    onDeleteHost: (host: Host) => void;
    onEditGroup: (group: HostGroup) => void;
    onDeleteGroup: (group: HostGroup) => void;
    renderHostCard: (
        host: Host,
        handlers: {
            onConnect: (host: Host) => void;
            onSplitWithLocal?: (host: Host) => void;
            onEdit: (host: Host) => void;
            onDelete: (host: Host) => void;
        },
    ) => React.ReactNode;
}

export function HostGroupSection({
    node,
    nested = false,
    onConnect,
    onSplitWithLocal,
    onEditHost,
    onDeleteHost,
    onEditGroup,
    onDeleteGroup,
    renderHostCard,
}: HostGroupSectionProps) {
    const { t } = useTranslation(["hosts", "common"]);
    const [expanded, setExpanded] = useState(true);

    const { setNodeRef, isOver } = useDroppable({
        id: `group:${node.group.id}`,
        data: { type: "group", groupId: node.group.id },
    });

    const handlers = {
        onConnect,
        onSplitWithLocal,
        onEdit: onEditHost,
        onDelete: onDeleteHost,
    };

    const hostCount = countHostsInNode(node);
    const accentColor = normalizeGroupColor(node.group.color);

    const groupMenu = (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <MoreHorizontal className="size-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-50 w-40">
                <GroupMenuItems
                    group={node.group}
                    onEditGroup={onEditGroup}
                    onDeleteGroup={onDeleteGroup}
                    Item={DropdownMenuItem}
                    Separator={DropdownMenuSeparator}
                />
            </DropdownMenuContent>
        </DropdownMenu>
    );

    const groupContextMenu = (
        <ContextMenuContent className="w-40">
            <GroupMenuItems
                group={node.group}
                onEditGroup={onEditGroup}
                onDeleteGroup={onDeleteGroup}
                Item={ContextMenuItem}
                Separator={ContextMenuSeparator}
            />
        </ContextMenuContent>
    );

    return (
        <article
            className={cn(
                "flex w-full min-w-0 flex-col gap-3",
                nested && "border-l-2 border-border/50 pl-4 sm:pl-5",
            )}
            style={
                nested
                    ? { borderLeftColor: `color-mix(in srgb, ${accentColor} 35%, transparent)` }
                    : undefined
            }
        >
            <SectionHeader
                accentColor={accentColor}
                expanded={expanded}
                onToggle={() => setExpanded((e) => !e)}
                icon={
                    <HostIconBadge
                        kind="group"
                        icon={node.group.icon}
                        color={node.group.color}
                        className="size-9 shrink-0 rounded-lg"
                        iconClassName="size-5"
                    />
                }
                title={node.group.name}
                hostCount={hostCount}
                menu={groupMenu}
                contextMenu={groupContextMenu}
            />

            {expanded && (
                <div
                    ref={setNodeRef}
                    className={cn(
                        "min-h-12 rounded-xl transition-colors",
                        isOver &&
                            "bg-primary/5 ring-1 ring-inset ring-primary/25",
                    )}
                >
                    {node.hosts.length > 0 && (
                        <div className={RESOURCE_TILE_GRID_CLASS}>
                            {node.hosts.map((host) => (
                                <div key={host.id} className={RESOURCE_GRID_ITEM_CLASS}>
                                    {renderHostCard(host, handlers)}
                                </div>
                            ))}
                        </div>
                    )}

                    {node.children.length > 0 && (
                        <div
                            className={cn(
                                "flex flex-col gap-5",
                                node.hosts.length > 0 && "mt-5",
                            )}
                        >
                            {node.children.map((child) => (
                                <HostGroupSection
                                    key={child.group.id}
                                    node={child}
                                    nested
                                    onConnect={onConnect}
                                    onSplitWithLocal={onSplitWithLocal}
                                    onEditHost={onEditHost}
                                    onDeleteHost={onDeleteHost}
                                    onEditGroup={onEditGroup}
                                    onDeleteGroup={onDeleteGroup}
                                    renderHostCard={renderHostCard}
                                />
                            ))}
                        </div>
                    )}

                    {node.hosts.length === 0 && node.children.length === 0 && (
                        <div
                            className="flex min-h-20 items-center justify-center rounded-xl border border-dashed
                                       border-border/70 bg-muted/10 px-4 py-6 text-center"
                        >
                            <p className="max-w-xs text-xs text-muted-foreground">
                                {t("group_empty_hint", {
                                    defaultValue:
                                        "Drop hosts here or add one to this group.",
                                })}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

interface UncategorizedSectionProps {
    hosts: Host[];
    onConnect: (host: Host) => void;
    onSplitWithLocal?: (host: Host) => void;
    onEditHost: (host: Host) => void;
    onDeleteHost: (host: Host) => void;
    renderHostCard: HostGroupSectionProps["renderHostCard"];
}

const UNCATEGORIZED_ACCENT = "#64748b";

export function UncategorizedHostSection({
    hosts,
    onConnect,
    onSplitWithLocal,
    onEditHost,
    onDeleteHost,
    renderHostCard,
}: UncategorizedSectionProps) {
    const { t } = useTranslation("hosts");
    const [expanded, setExpanded] = useState(true);

    const { setNodeRef, isOver } = useDroppable({
        id: "group:uncategorized",
        data: { type: "group", groupId: null },
    });

    if (hosts.length === 0) return null;

    const handlers = {
        onConnect,
        onSplitWithLocal,
        onEdit: onEditHost,
        onDelete: onDeleteHost,
    };

    const uncategorizedIconStyle = groupIconBadgeStyle(UNCATEGORIZED_ACCENT);

    return (
        <section className="flex w-full min-w-0 flex-col gap-3">
            <SectionHeader
                accentColor={UNCATEGORIZED_ACCENT}
                expanded={expanded}
                onToggle={() => setExpanded((e) => !e)}
                icon={
                    <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                        style={uncategorizedIconStyle}
                    >
                        <FolderOpen className="size-5" />
                    </div>
                }
                title={t("uncategorized")}
                hostCount={hosts.length}
            />

            {expanded && (
                <div
                    ref={setNodeRef}
                    className={cn(
                        "min-h-8 rounded-xl transition-colors",
                        isOver && "bg-primary/5 ring-1 ring-inset ring-primary/25",
                    )}
                >
                    <div className={RESOURCE_TILE_GRID_CLASS}>
                        {hosts.map((host) => (
                            <div key={host.id} className={RESOURCE_GRID_ITEM_CLASS}>
                                {renderHostCard(host, handlers)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export function HostGroupsList({ children }: { children: React.ReactNode }) {
    return <div className="flex w-full flex-col gap-6">{children}</div>;
}

/** @deprecated Use HostGroupsList */
export const HostGroupCardGrid = HostGroupsList;
