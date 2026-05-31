import { useSessionStore } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { WindowControls } from "@/components/layout/WindowControls";
import { TerminalTab } from "@/components/layout/TerminalTab";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore.ts";
import { MAC_TITLE_BAR_HEIGHT_PX } from "@/lib/platform";
import { usePlatform } from "@/hooks/usePlatform";
import { Window } from "@wailsio/runtime";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import React, { useRef } from "react";

function handleTitleBarDoubleClick(e: React.MouseEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (target.closest(".wails-no-drag") || target.closest("button")) {
        return;
    }
    void Window.ToggleMaximise();
}

export function TitleBar() {
    const { t } = useTranslation("terminal");
    const { sessions, activeSessionId, setActiveSession, removeSession } =
        useSessionStore();
    const { activeView, openNewTabHostPicker } = useUIStore();
    const { isMac } = usePlatform();

    const isTerminalView = activeView === ViewType.Terminal;
    const { isUnlocked } = useAuthStore();
    const newTabShortcut = isMac ? "⌘T" : "Ctrl+T";

    const scrollRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (scrollRef.current && e.deltaY !== 0) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    const closeOthers = (sessionId: string) => {
        sessions
            .filter((session) => session.id !== sessionId)
            .forEach((session) => removeSession(session.id));
    };

    const closeAll = () => {
        sessions.forEach((session) => removeSession(session.id));
    };

    return (
        <header
            onDoubleClick={handleTitleBarDoubleClick}
            className={cn(
                "wails-drag flex shrink-0 items-center bg-transparent",
                isMac ? "h-9" : "h-8 pr-0",
            )}
            style={
                isMac
                    ? { height: `${MAC_TITLE_BAR_HEIGHT_PX}px` }
                    : undefined
            }
        >
            {isMac && <WindowControls className="shrink-0" />}

            <div
                ref={scrollRef}
                onWheel={handleWheel}
                className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden px-2 [&::-webkit-scrollbar]:hidden"
            >
                {isUnlocked &&
                    sessions.map((session) => (
                        <TerminalTab
                            key={session.id}
                            session={session}
                            isActive={
                                isTerminalView &&
                                session.id === activeSessionId
                            }
                            onClick={() => setActiveSession(session.id)}
                            onClose={() => removeSession(session.id)}
                            onCloseOthers={() => closeOthers(session.id)}
                            onCloseAll={closeAll}
                        />
                    ))}
                {isUnlocked && (
                    <button
                        type="button"
                        title={t("new_tab_button_shortcut", {
                            shortcut: newTabShortcut,
                        })}
                        aria-label={t("new_tab_button_shortcut", {
                            shortcut: newTabShortcut,
                        })}
                        className="wails-no-drag flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                        onClick={openNewTabHostPicker}
                    >
                        <Plus className="size-3.5" />
                    </button>
                )}
            </div>

            {!isMac && <WindowControls className="ml-2 shrink-0" />}
        </header>
    );
}
