import { MoreHorizontal, Edit, Trash2, Terminal } from "lucide-react";
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
import { HOST_CARD_SURFACE_CLASS } from "@/lib/hostAppearance";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface HostCardProps {
    host: Host;
    onConnect: (host: Host) => void;
    onEdit: (host: Host) => void;
    onDelete: (host: Host) => void;
}

function HostCardMenuItems({
    host,
    onConnect,
    onEdit,
    onDelete,
    Item,
    Separator,
}: {
    host: Host;
    onConnect: (host: Host) => void;
    onEdit: (host: Host) => void;
    onDelete: (host: Host) => void;
    Item: typeof ContextMenuItem | typeof DropdownMenuItem;
    Separator: typeof ContextMenuSeparator | typeof DropdownMenuSeparator;
}) {
    const { t } = useTranslation("common");

    return (
        <>
            <Item onClick={() => onConnect(host)}>
                <Terminal className="mr-2 size-4" />
                {t("connect", { defaultValue: "Connect" })}
            </Item>
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

export function HostCard({ host, onConnect, onEdit, onDelete }: HostCardProps) {
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
                    className={cn(
                        "group flex flex-row justify-between rounded-xl transition-all",
                        HOST_CARD_SURFACE_CLASS,
                        "hover:border-primary/40 hover:shadow-md",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    )}
                >
                    <div
                        onClick={() => onConnect(host)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 p-5"
                    >
                        <HostIconBadge icon={host.icon} color={host.color} />
                        <div className="flex min-w-0 flex-col pr-4">
                            <h3 className="truncate font-semibold text-card-foreground">
                                {host.name || host.host}
                            </h3>
                            <p className="truncate text-xs text-muted-foreground">
                                {host.username}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center pr-4">
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
