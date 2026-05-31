import {
    Server,
    Key,
    User,
    Settings,
    PanelLeftClose,
    PanelLeftOpen,
    FileCode2,
    FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore, ViewType } from "@/store/uiStore";
import { cn } from "@/lib/utils";
import { SyncStatus } from "../../../bindings/terminator-desktop/backend/internal/services/sync";
import { useSyncStore } from "@/store/syncStore.ts";
import { useTranslation } from "react-i18next";
import { UpdatePopover } from "@/components/layout/UpdatePopover.tsx";
import { sidebarNavButtonClass } from "@/lib/sidebarNav";
import { usePlatform } from "@/hooks/usePlatform";

function SidebarToggleButton({
    isVisible,
    shortcut,
    onClick,
    className,
}: {
    isVisible: boolean;
    shortcut: string;
    onClick: () => void;
    className?: string;
}) {
    const { t } = useTranslation("common");
    const label = isVisible
        ? t("hide_sidebar_shortcut", { shortcut })
        : t("show_sidebar_shortcut", { shortcut });

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn(sidebarNavButtonClass(isVisible), className)}
            title={label}
            aria-label={label}
        >
            {isVisible ? (
                <PanelLeftClose className="size-5" />
            ) : (
                <PanelLeftOpen className="size-5" />
            )}
        </Button>
    );
}

export function Sidebar() {
    const { t } = useTranslation(["common", "hosts", "update"]);
    const { activeView, setActiveView, isSidebarVisible, toggleSidebar } =
        useUIStore();
    const { status } = useSyncStore();
    const { isMac } = usePlatform();

    const isCollapsed = !isSidebarVisible;
    const sidebarShortcut = isMac ? "⌘B" : "Ctrl+B";

    let dotColor = "bg-muted-foreground";
    if (status === SyncStatus.SyncStatusSyncing)
        dotColor = "bg-info animate-pulse";
    if (status === SyncStatus.SyncStatusSuccess) dotColor = "bg-success";
    if (
        status === SyncStatus.SyncStatusError ||
        status === SyncStatus.SyncStatusUnauthenticated
    )
        dotColor = "bg-destructive";

    return (
        <div className="relative shrink-0">
            <div
                className={cn(
                    "overflow-hidden transition-[width] duration-200 ease-in-out",
                    isCollapsed ? "w-0" : "w-14",
                )}
            >
                <aside
                    className={cn(
                        "wails-drag flex h-full w-14 flex-col items-center justify-between border-r border-border/40 bg-transparent pb-4 pt-2",
                        "transition-transform duration-200 ease-in-out will-change-transform",
                        isCollapsed && "-translate-x-full",
                    )}
                >
                <nav className="flex flex-col gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView(ViewType.Hosts)}
                        className={sidebarNavButtonClass(
                            activeView === ViewType.Hosts,
                        )}
                        title={t("page_title", { ns: "hosts" })}
                    >
                        <Server className="size-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView(ViewType.Keys)}
                        className={sidebarNavButtonClass(activeView === ViewType.Keys)}
                        title={t("page_title", { ns: "keys" })}
                    >
                        <Key className="size-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView(ViewType.Identities)}
                        className={sidebarNavButtonClass(
                            activeView === ViewType.Identities,
                        )}
                        title={t("page_title", { ns: "identities" })}
                    >
                        <User className="size-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView(ViewType.Snippets)}
                        className={sidebarNavButtonClass(
                            activeView === ViewType.Snippets,
                        )}
                        title={t("page_title", { ns: "snippets" })}
                    >
                        <FileCode2 className="size-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActiveView(ViewType.Sftp)}
                        className={sidebarNavButtonClass(activeView === ViewType.Sftp)}
                        title={t("page_title", { ns: "sftp" })}
                    >
                        <FolderOpen className="size-5" />
                    </Button>
                </nav>

                <nav className="flex flex-col gap-2">
                    <UpdatePopover />

                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveView(ViewType.Settings)}
                            className={sidebarNavButtonClass(
                                activeView === ViewType.Settings,
                            )}
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

                    <div className="size-9 shrink-0" aria-hidden />
                </nav>
            </aside>
            </div>

            <SidebarToggleButton
                isVisible={isSidebarVisible}
                shortcut={sidebarShortcut}
                onClick={toggleSidebar}
                className={cn(
                    "wails-no-drag absolute bottom-4 z-10",
                    "transition-[left,transform,box-shadow,border-color,background-color] duration-200 ease-in-out",
                    isCollapsed
                        ? "left-1 rounded-md border border-border bg-background shadow-sm"
                        : "left-7 -translate-x-1/2",
                )}
            />
        </div>
    );
}
