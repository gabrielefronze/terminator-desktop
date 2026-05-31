import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { formatTabGroupHostList } from "@/lib/tabGroups";
import {
    RESOURCE_ROW_CARD_ACTIONS_CLASS,
    RESOURCE_ROW_CARD_BODY_CLASS,
    RESOURCE_ROW_CARD_SURFACE_CLASS,
    RESOURCE_ROW_CARD_TEXT_CLASS,
} from "@/lib/resourceLayout";
import { Host, TabGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface TabGroupCardProps {
    group: TabGroup;
    hosts: Host[];
    onOpen: (group: TabGroup) => void;
    onEdit: (group: TabGroup) => void;
    onDelete: (group: TabGroup) => void;
}

export function TabGroupCard({
    group,
    hosts,
    onOpen,
    onEdit,
    onDelete,
}: TabGroupCardProps) {
    const { t } = useTranslation(["tabgroups", "common"]);

    return (
        <div className={cn(RESOURCE_ROW_CARD_SURFACE_CLASS)}>
            <button
                type="button"
                onClick={() => onOpen(group)}
                className={RESOURCE_ROW_CARD_BODY_CLASS}
            >
                <HostIconBadge icon={group.icon} color={group.color} />
                <div className={RESOURCE_ROW_CARD_TEXT_CLASS}>
                    <h3 className="truncate font-semibold text-card-foreground">
                        {group.name}
                    </h3>
                    <p className="truncate text-xs text-muted-foreground">
                        {hosts.length > 0
                            ? formatTabGroupHostList(hosts)
                            : t("no_hosts_available")}
                    </p>
                </div>
            </button>

            <div className={RESOURCE_ROW_CARD_ACTIONS_CLASS}>
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
                        <DropdownMenuItem onClick={() => onEdit(group)}>
                            <Edit className="mr-2 size-4" />
                            {t("edit", { ns: "common" })}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(group)}
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
