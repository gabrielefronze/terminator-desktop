import { useState } from "react";
import { ChevronDown, ChevronRight, Folder, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Host, HostGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { HostTreeNode } from "@/lib/hostTree";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useDroppable } from "@dnd-kit/core";

interface HostGroupSectionProps {
    node: HostTreeNode;
    depth?: number;
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
    depth = 0,
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

    return (
        <section
            className={cn("w-full", depth > 0 && "ml-4 border-l border-border pl-4")}
        >
            <div className="mb-3 flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1 text-left
                               hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {expanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <Folder className="size-4 shrink-0 text-primary" />
                    <span className="truncate font-semibold text-foreground">
                        {node.group.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                        {t("host_count", { count: node.hosts.length })}
                    </span>
                </button>

                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="size-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 z-50">
                        <DropdownMenuItem onClick={() => onEditGroup(node.group)}>
                            <Edit className="mr-2 size-4" />
                            {t("edit_group")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => onDeleteGroup(node.group)}
                            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                            <Trash2 className="mr-2 size-4" />
                            {t("delete_group")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {expanded && (
                <div
                    ref={setNodeRef}
                    className={cn(
                        "min-h-8 rounded-lg transition-colors",
                        isOver && "bg-primary/5 ring-1 ring-primary/30",
                    )}
                >
                    {node.hosts.length > 0 && (
                        <div
                            className="mb-4 grid w-full gap-4"
                            style={{
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(20rem, 1fr))",
                            }}
                        >
                            {node.hosts.map((host) => (
                                <div key={host.id}>
                                    {renderHostCard(host, handlers)}
                                </div>
                            ))}
                        </div>
                    )}

                    {node.children.map((child) => (
                        <HostGroupSection
                            key={child.group.id}
                            node={child}
                            depth={depth + 1}
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
        </section>
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
                    <div
                        className="grid w-full gap-4"
                        style={{
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(20rem, 1fr))",
                        }}
                    >
                        {hosts.map((host) => (
                            <div key={host.id}>
                                {renderHostCard(host, handlers)}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
