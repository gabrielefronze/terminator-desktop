import { User, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SavedIdentity } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { LinkedHostsList } from "@/components/views/LinkedHostsList";
import type { HostLink } from "@/lib/hostLinks";
import { useTranslation } from "react-i18next";

interface IdentityCardProps {
    identity: SavedIdentity;
    linkedHosts: HostLink[];
    onEdit: (identity: SavedIdentity) => void;
    onDelete: (identity: SavedIdentity) => void;
}

export function IdentityCard({
    identity,
    linkedHosts,
    onEdit,
    onDelete,
}: IdentityCardProps) {
    const { t } = useTranslation(["identities", "common"]);

    return (
        <div
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) {
                    e.preventDefault();
                    onEdit(identity);
                }
            }}
            className="group flex flex-col bg-card shadow-sm transition-all
                       rounded-xl border border-border
                       hover:border-primary/40 hover:shadow-md
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="flex flex-row justify-between">
                <div
                    onClick={() => onEdit(identity)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 p-5 pb-3"
                >
                    <div
                        className="flex size-10 shrink-0 items-center justify-center rounded-lg
                                    bg-primary/10 text-primary"
                    >
                        <User className="size-5" />
                    </div>
                    <div className="flex min-w-0 flex-col pr-4">
                        <h3 className="truncate font-semibold text-card-foreground">
                            {identity.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                            {identity.username}
                        </p>
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
                            <DropdownMenuItem onClick={() => onEdit(identity)}>
                                <Edit className="mr-2 size-4" />
                                {t("edit", { ns: "common" })}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onDelete(identity)}
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
                <LinkedHostsList links={linkedHosts} />
            </div>
        </div>
    );
}
