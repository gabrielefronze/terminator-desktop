import { useSessionStore } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { WindowControls } from "@/components/layout/WindowControls";
import { TerminalTab } from "@/components/layout/TerminalTab";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore.ts";
import { MAC_TITLE_BAR_HEIGHT_PX } from "@/lib/platform";
import { usePlatform } from "@/hooks/usePlatform";
import React, { useRef } from "react";

export function TitleBar() {
    const { sessions, activeSessionId, setActiveSession, removeSession } =
        useSessionStore();
    const { activeView } = useUIStore();
    const { isMac } = usePlatform();

    const isTerminalView = activeView === ViewType.Terminal;
    const { isUnlocked } = useAuthStore();

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
            </div>

            {!isMac && <WindowControls className="ml-2 shrink-0" />}
        </header>
    );
}
