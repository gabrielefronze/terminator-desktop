import { Braces, Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    RESOURCE_ROW_CARD_ACTIONS_CLASS,
    RESOURCE_ROW_CARD_BODY_CLASS,
    RESOURCE_ROW_CARD_SURFACE_CLASS,
    RESOURCE_ROW_CARD_TEXT_CLASS,
} from "@/lib/resourceLayout";
import { SavedSnippet } from "../../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SnippetCardProps {
    snippet: SavedSnippet;
    onEdit: (snippet: SavedSnippet) => void;
    onDelete: (snippet: SavedSnippet) => void;
}

export function SnippetCard({ snippet, onEdit, onDelete }: SnippetCardProps) {
    const { t } = useTranslation(["snippets", "common"]);

    return (
        <div
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) {
                    e.preventDefault();
                    onEdit(snippet);
                }
            }}
            className={cn(RESOURCE_ROW_CARD_SURFACE_CLASS)}
        >
            <div
                onClick={() => onEdit(snippet)}
                className={RESOURCE_ROW_CARD_BODY_CLASS}
            >
                <div
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg
                                bg-primary/10 text-primary"
                >
                    <Braces className="size-5" />
                </div>
                <div className={RESOURCE_ROW_CARD_TEXT_CLASS}>
                    <h3 className="truncate font-semibold text-card-foreground">
                        {snippet.name}
                    </h3>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                        {snippet.content}
                    </p>
                </div>
            </div>

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
                        <DropdownMenuItem onClick={() => onEdit(snippet)}>
                            <Edit className="mr-2 size-4" />
                            {t("edit", { ns: "common" })}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            variant="destructive"
                            onClick={() => onDelete(snippet)}
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
