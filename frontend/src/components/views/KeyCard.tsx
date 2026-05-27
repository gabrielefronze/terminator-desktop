import { Key, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SavedKey } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { LinkedHostsList } from "@/components/views/LinkedHostsList";
import type { HostLink } from "@/lib/hostLinks";
import type { Host } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { useTranslation } from "react-i18next";

interface KeyCardProps {
    savedKey: SavedKey;
    linkedHosts: Host[];
    onEdit: (key: SavedKey) => void;
    onDelete: (key: SavedKey) => void;
}

function hostsToLinks(hosts: Host[]): HostLink[] {
    return hosts.map((host) => ({ host, roles: ["key"] as const }));
}

export function KeyCard({
    savedKey,
    linkedHosts,
    onEdit,
    onDelete,
}: KeyCardProps) {
    const { t } = useTranslation(["keys", "common"]);

    return (
        <div
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) {
                    e.preventDefault();
                    onEdit(savedKey);
                }
            }}
            className="group flex flex-col bg-card shadow-sm transition-all
                       rounded-xl border border-border
                       hover:border-primary/40 hover:shadow-md
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="flex flex-row justify-between">
                <div
                    onClick={() => onEdit(savedKey)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 p-5 pb-3"
                >
                    <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg
                                    bg-primary/10 text-primary"
                    >
                        <Key className="size-5" />
                    </div>
                    <div className="flex min-w-0 flex-col pr-4">
                        <h3 className="truncate font-semibold text-card-foreground">
                            {savedKey.name}
                        </h3>
                    </div>
                </div>

                <div className="flex shrink-0 items-start pt-5 pr-4">
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                className="opacity-0 transition-opacity group-hover:opacity-100
                                           data-[state=open]:opacity-100
                                           focus-visible:opacity-100"
                            >
                                <MoreHorizontal className="size-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-50 w-40">
                            <DropdownMenuItem onClick={() => onEdit(savedKey)}>
                                <Edit className="mr-2 size-4" />
                                {t("edit", { ns: "common" })}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(savedKey)}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                            >
                                <Trash2 className="mr-2 size-4" />
                                {t("delete", { ns: "common" })}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            <div className="border-t border-border/60 px-5 pb-4 pt-3">
                <p className="mb-2 text-2xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("linked_hosts_label", { ns: "common" })}
                </p>
                <LinkedHostsList links={hostsToLinks(linkedHosts)} />
            </div>
        </div>
    );
}
