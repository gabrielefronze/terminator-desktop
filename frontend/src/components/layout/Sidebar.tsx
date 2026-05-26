import { Server, Key, User, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore, ViewType } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { SyncStatus } from "../../../bindings/terminator-desktop/backend/internal/services/sync";
import { useSyncStore } from "@/store/syncStore.ts";
import { useTranslation } from "react-i18next";
import { UpdatePopover } from "@/components/layout/UpdatePopover.tsx";

export function Sidebar() {
    const { t } = useTranslation(["hosts", "update"]);
    const { activeView, setActiveView, isSidebarVisible, toggleSidebar } =
        useUIStore();
    const { status } = useSyncStore();

    const isTerminalView = activeView === ViewType.Terminal;
    const isExpanded = !isTerminalView || isSidebarVisible;

    let dotColor = "bg-muted-foreground";
    if (status === SyncStatus.SyncStatusSyncing)
        dotColor = "bg-info animate-pulse";
    if (status === SyncStatus.SyncStatusSuccess) dotColor = "bg-success";
    if (
        status === SyncStatus.SyncStatusError ||
        status === SyncStatus.SyncStatusUnauthenticated
    )
        dotColor = "bg-destructive";

    const showCollapseToggle = isTerminalView;

    return (
        <div
            className={cn(
                "relative shrink-0",
                isExpanded ? "w-14" : "w-0",
            )}
        >
            <aside
                className={cn(
                    "wails-drag flex h-full flex-col items-center justify-between border-r border-border/40 bg-transparent pb-4 pt-2",
                    isExpanded
                        ? "w-14"
                        : "pointer-events-none w-0 overflow-hidden opacity-0",
                )}
            >
                <nav className="flex flex-col gap-2">
                    <Button
                        variant={
                            activeView === ViewType.Hosts
                                ? "secondary"
                                : "ghost"
                        }
                        size="icon"
                        onClick={() => setActiveView(ViewType.Hosts)}
                        className="wails-no-drag"
                        title={t("page_title", { ns: "hosts" })}
                    >
                        <Server className="size-5" />
                    </Button>

                    <Button
                        variant={
                            activeView === ViewType.Keys ? "secondary" : "ghost"
                        }
                        size="icon"
                        onClick={() => setActiveView(ViewType.Keys)}
                        className="wails-no-drag"
                        title={t("page_title", { ns: "keys" })}
                    >
                        <Key className="size-5" />
                    </Button>

                    <Button
                        variant={
                            activeView === ViewType.Identities
                                ? "secondary"
                                : "ghost"
                        }
                        size="icon"
                        onClick={() => setActiveView(ViewType.Identities)}
                        className="wails-no-drag"
                        title={t("page_title", { ns: "identities" })}
                    >
                        <User className="size-5" />
                    </Button>
                </nav>

                <nav className="flex flex-col gap-2">
                    <UpdatePopover />

                    <div className="relative">
                        <Button
                            variant={
                                activeView === ViewType.Settings
                                    ? "secondary"
                                    : "ghost"
                            }
                            size="icon"
                            onClick={() => setActiveView(ViewType.Settings)}
                            className="wails-no-drag text-muted-foreground hover:text-foreground"
                            title={t("page_title", { ns: "settings" })}
                        >
                            <Settings className="size-5" />
                        </Button>

                        <div
                            className={cn(
                                "absolute right-1 top-1 size-2 rounded-full",
                                dotColor,
                            )}
                        />
                    </div>
                </nav>
            </aside>

            {showCollapseToggle && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={toggleSidebar}
                    aria-label={
                        isSidebarVisible ? "Collapse sidebar" : "Expand sidebar"
                    }
                    className={cn(
                        "wails-no-drag absolute top-1/2 z-10 !size-5 -translate-y-1/2",
                        "rounded-full bg-background/90 p-0 shadow-sm",
                        "text-muted-foreground hover:bg-muted hover:text-foreground",
                        isSidebarVisible
                            ? "right-0 translate-x-1/2"
                            : "left-0 translate-x-0",
                    )}
                >
                    {isSidebarVisible ? (
                        <ChevronLeft className="size-3" strokeWidth={2.5} />
                    ) : (
                        <ChevronRight className="size-3" strokeWidth={2.5} />
                    )}
                </Button>
            )}
        </div>
    );
}
