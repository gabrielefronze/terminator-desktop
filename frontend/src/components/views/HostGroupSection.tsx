import { useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { groupCardBorderColor } from "@/lib/hostAppearance";
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
import { useDroppable } from "@dnd-kit/core";

/** Host cards use max-w-80 (20rem); groups span two cards plus gap-3. */
const HOST_CARD_MAX = "20rem";
const GROUP_CARD_WIDTH = `calc(2 * ${HOST_CARD_MAX} + 0.75rem)`;

const GROUP_HOST_GRID_CLASS = "grid grid-cols-2 gap-3 justify-items-start";

const UNCATEGORIZED_HOST_GRID_CLASS =
    "grid gap-3 grid-cols-[repeat(auto-fill,minmax(17rem,20rem))] justify-items-start";

const GROUP_CARD_CLASS =
    "flex w-full max-w-[var(--group-card-width)] flex-col rounded-xl border bg-muted/10";

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

interface HostGroupSectionProps {
    node: HostTreeNode;
    nested?: boolean;
    onConnect: (host: Host) => void;
    onEditHost: (host: Host) => void;
    onDeleteHost: (host: Host) => void;
    onEditGroup: (group: HostGroup) => void;
    onDeleteGroup: (group: HostGroup) => void;
    renderHostCard: (
        host: Host,
        handlers: {
            onConnect: (host: Host) => void;
            onEdit: (host: Host) => void;
            onDelete: (host: Host) => void;
        },
    ) => React.ReactNode;
}

export function HostGroupSection({
    node,
    nested = false,
    onConnect,
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
        onEdit: onEditHost,
        onDelete: onDeleteHost,
    };

    const hostCount = countHostsInNode(node);

    const borderColor = groupCardBorderColor(node.group.color);

    return (
        <article
            style={{
                ["--group-card-width" as string]: GROUP_CARD_WIDTH,
                borderColor,
            }}
            className={cn(GROUP_CARD_CLASS, nested && "max-w-none")}
        >
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className="flex items-center gap-2 border-b border-border/40 px-1 py-3">
                        <button
                            type="button"
                            onClick={() => setExpanded((e) => !e)}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg text-left
                                       hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {expanded ? (
                                <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            )}
                            <HostIconBadge
                                kind="group"
                                icon={node.group.icon}
                                color={node.group.color}
                                className="size-9 rounded-lg"
                                iconClassName="size-5"
                            />
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate font-semibold text-foreground">
                                    {node.group.name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("host_count", { count: hostCount })}
                                </span>
                            </div>
                        </button>

                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
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
                    </div>
                </ContextMenuTrigger>

                <ContextMenuContent className="w-40">
                    <GroupMenuItems
                        group={node.group}
                        onEditGroup={onEditGroup}
                        onDeleteGroup={onDeleteGroup}
                        Item={ContextMenuItem}
                        Separator={ContextMenuSeparator}
                    />
                </ContextMenuContent>
            </ContextMenu>

            {expanded && (
                <div
                    ref={setNodeRef}
                    className={cn(
                        "flex min-h-12 flex-col gap-4 px-1 pb-1 pt-3 transition-colors",
                        isOver && "rounded-lg bg-primary/5 ring-1 ring-inset ring-primary/30",
                    )}
                >
                    {node.hosts.length > 0 && (
                        <div className={GROUP_HOST_GRID_CLASS}>
                            {node.hosts.map((host) => (
                                <div key={host.id} className="w-full max-w-80">
                                    {renderHostCard(host, handlers)}
                                </div>
                            ))}
                        </div>
                    )}

                    {node.children.length > 0 && (
                        <div className="flex flex-col gap-4">
                            {node.children.map((child) => (
                                <HostGroupSection
                                    key={child.group.id}
                                    node={child}
                                    nested
                                    onConnect={onConnect}
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
                        <p className="text-center text-xs text-muted-foreground py-2">
                            {t("group_empty_hint", {
                                defaultValue: "Drop hosts here or add one to this group.",
                            })}
                        </p>
                    )}
                </div>
            )}
        </article>
    );
}

interface UncategorizedSectionProps {
    hosts: Host[];
    onConnect: (host: Host) => void;
    onEditHost: (host: Host) => void;
    onDeleteHost: (host: Host) => void;
    renderHostCard: HostGroupSectionProps["renderHostCard"];
}

export function UncategorizedHostSection({
    hosts,
    onConnect,
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
        onEdit: onEditHost,
        onDelete: onDeleteHost,
    };

    return (
        <section className="w-full">
            <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="mb-3 flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left
                           hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                {expanded ? (
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                ) : (
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-semibold text-muted-foreground">
                    {t("uncategorized")}
                </span>
                <span className="text-xs text-muted-foreground">
                    {t("host_count", { count: hosts.length })}
                </span>
            </button>

            {expanded && (
                <div
                    ref={setNodeRef}
                    className={cn(
                        "min-h-8 rounded-lg transition-colors",
                        isOver && "bg-primary/5 ring-1 ring-primary/30",
                    )}
                >
                    <div className={UNCATEGORIZED_HOST_GRID_CLASS}>
                        {hosts.map((host) => (
                            <div key={host.id} className="w-full max-w-80">
                                {renderHostCard(host, handlers)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export function HostGroupCardGrid({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{ ["--group-card-width" as string]: GROUP_CARD_WIDTH }}
            className="grid w-full gap-6
                       grid-cols-[repeat(auto-fill,var(--group-card-width))]
                       justify-items-start"
        >
            {children}
        </div>
    );
}
