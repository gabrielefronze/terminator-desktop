import { MoreHorizontal, Terminal } from "lucide-react";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { RunningContainer } from "../../../bindings/terminator-desktop/backend/internal/services/containers";
import {
    RESOURCE_ROW_CARD_ACTIONS_CLASS,
    RESOURCE_ROW_CARD_BODY_CLASS,
    RESOURCE_ROW_CARD_SURFACE_CLASS,
    RESOURCE_ROW_CARD_TEXT_CLASS,
} from "@/lib/resourceLayout";
import { DEFAULT_HOST_COLOR } from "@/lib/hostAppearance";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface ContainerCardProps {
    container: RunningContainer;
    onConnect: (container: RunningContainer) => void;
}

function ContainerCardMenuItems({
    container,
    onConnect,
    Item,
}: {
    container: RunningContainer;
    onConnect: (container: RunningContainer) => void;
    Item: typeof ContextMenuItem | typeof DropdownMenuItem;
}) {
    const { t } = useTranslation(["common", "containers"]);

    return (
        <Item onClick={() => onConnect(container)}>
            <Terminal className="mr-2 size-4" />
            {t("connect", { ns: "common", defaultValue: "Connect" })}
        </Item>
    );
}

export function ContainerCard({ container, onConnect }: ContainerCardProps) {
    const { t } = useTranslation("containers");

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target === e.currentTarget) {
                            e.preventDefault();
                            onConnect(container);
                        }
                    }}
                    className={cn(RESOURCE_ROW_CARD_SURFACE_CLASS)}
                >
                    <div
                        onClick={() => onConnect(container)}
                        className={RESOURCE_ROW_CARD_BODY_CLASS}
                    >
                        <div className="relative shrink-0">
                            <HostIconBadge
                                icon="container"
                                color={DEFAULT_HOST_COLOR}
                            />
                            <span
                                role="status"
                                title={container.status || t("status_running")}
                                aria-label={container.status || t("status_running")}
                                className={cn(
                                    "absolute -right-0.5 -top-0.5 inline-block size-2 shrink-0",
                                    "rounded-full bg-success ring-2 ring-host-card",
                                )}
                            />
                        </div>
                        <div
                            className={RESOURCE_ROW_CARD_TEXT_CLASS}
                            title={container.status || undefined}
                        >
                            <h3 className="truncate font-semibold text-card-foreground">
                                {container.name}
                            </h3>
                            <p className="truncate text-xs text-muted-foreground">
                                {container.image}
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
                                <ContainerCardMenuItems
                                    container={container}
                                    onConnect={onConnect}
                                    Item={DropdownMenuItem}
                                />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </ContextMenuTrigger>

            <ContextMenuContent className="w-40">
                <ContainerCardMenuItems
                    container={container}
                    onConnect={onConnect}
                    Item={ContextMenuItem}
                />
            </ContextMenuContent>
        </ContextMenu>
    );
}
