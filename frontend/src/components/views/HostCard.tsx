import { MoreHorizontal, Edit, Trash2, Terminal, Columns2 } from "lucide-react";
import { HostIconBadge } from "@/components/views/HostIconBadge";
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
import { Host } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { HostPingResult } from "../../../bindings/terminator-desktop/backend/internal/services/reachability";
import { HostReachabilityIndicator } from "@/components/views/HostReachabilityIndicator";
import {
    RESOURCE_ROW_CARD_ACTIONS_CLASS,
    RESOURCE_ROW_CARD_BODY_CLASS,
    RESOURCE_ROW_CARD_SURFACE_CLASS,
    RESOURCE_ROW_CARD_TEXT_CLASS,
} from "@/lib/resourceLayout";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface HostCardProps {
    host: Host;
    reachability?: HostPingResult;
    reachabilityChecking?: boolean;
    onConnect: (host: Host) => void;
    onSplitWithLocal?: (host: Host) => void;
    onEdit: (host: Host) => void;
    onDelete: (host: Host) => void;
}

function HostCardMenuItems({
    host,
    onConnect,
    onSplitWithLocal,
    onEdit,
    onDelete,
    Item,
    Separator,
}: {
    host: Host;
    onConnect: (host: Host) => void;
    onSplitWithLocal?: (host: Host) => void;
    onEdit: (host: Host) => void;
    onDelete: (host: Host) => void;
    Item: typeof ContextMenuItem | typeof DropdownMenuItem;
    Separator: typeof ContextMenuSeparator | typeof DropdownMenuSeparator;
}) {
    const { t } = useTranslation(["common", "hosts"]);

    return (
        <>
            <Item onClick={() => onConnect(host)}>
                <Terminal className="mr-2 size-4" />
                {t("connect", { ns: "common", defaultValue: "Connect" })}
            </Item>
            {onSplitWithLocal && (
                <Item onClick={() => onSplitWithLocal(host)}>
                    <Columns2 className="mr-2 size-4" />
                    {t("split_with_local", { ns: "hosts" })}
                </Item>
            )}
            <Item onClick={() => onEdit(host)}>
                <Edit className="mr-2 size-4" />
                {t("edit")}
            </Item>
            <Separator />
            <Item
                variant="destructive"
                onClick={() => onDelete(host)}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
                <Trash2 className="mr-2 size-4" />
                {t("delete")}
            </Item>
        </>
    );
}

export function HostCard({
    host,
    reachability,
    reachabilityChecking,
    onConnect,
    onSplitWithLocal,
    onEdit,
    onDelete,
}: HostCardProps) {
    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target === e.currentTarget) {
                            e.preventDefault();
                            onConnect(host);
                        }
                    }}
                    className={cn(RESOURCE_ROW_CARD_SURFACE_CLASS)}
                >
                    <div
                        onClick={() => onConnect(host)}
                        className={RESOURCE_ROW_CARD_BODY_CLASS}
                    >
                        <div className="relative shrink-0">
                            <HostIconBadge icon={host.icon} color={host.color} />
                            <HostReachabilityIndicator
                                result={reachability}
                                isChecking={reachabilityChecking}
                                className="absolute -right-0.5 -top-0.5"
                            />
                        </div>
                        <div className={RESOURCE_ROW_CARD_TEXT_CLASS}>
                            <h3 className="truncate font-semibold text-card-foreground">
                                {host.name || host.host}
                            </h3>
                            <p className="truncate text-xs text-muted-foreground">
                                {host.username}
                            </p>
                        </div>
                    </div>

                    <div className={RESOURCE_ROW_CARD_ACTIONS_CLASS}>
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    className="opacity-0 transition-opacity
                                               group-hover:opacity-100 data-[state=open]:opacity-100
                                               focus-visible:opacity-100"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreHorizontal className="size-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                align="end"
                                className="z-50 w-40"
                            >
                                <HostCardMenuItems
                                    host={host}
                                    onConnect={onConnect}
                                    onSplitWithLocal={onSplitWithLocal}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    Item={DropdownMenuItem}
                                    Separator={DropdownMenuSeparator}
                                />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-40">
                <HostCardMenuItems
                    host={host}
                    onConnect={onConnect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    Item={ContextMenuItem}
                    Separator={ContextMenuSeparator}
                />
            </ContextMenuContent>
        </ContextMenu>
    );
}
