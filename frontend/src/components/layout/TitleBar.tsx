import { useSessionStore } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { WindowControls } from "@/components/layout/WindowControls";
import { TerminalTab } from "@/components/layout/TerminalTab";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore.ts";
import {
    MAC_TITLE_BAR_HEIGHT_PX,
    MAC_TRAFFIC_LIGHT_GUTTER_PX,
} from "@/lib/platform";
import { usePlatform } from "@/hooks/usePlatform";
import React, { useRef } from "react";

export function TitleBar() {
    const { sessions, activeSessionId, setActiveSession, removeSession } =
        useSessionStore();
    const { activeView } = useUIStore();
    const { isMac, usesCustomWindowControls } = usePlatform();

    const isTerminalView = activeView === ViewType.Terminal;
    const showSidebarColumn = !isMac && !isTerminalView;

    const { isUnlocked } = useAuthStore();

    const scrollRef = useRef<HTMLDivElement>(null);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (scrollRef.current && e.deltaY !== 0) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    return (
        <header
            className={cn(
                "wails-drag flex shrink-0 items-end justify-between bg-transparent",
                !isMac && "h-10",
                usesCustomWindowControls ? "pr-0" : "pr-2",
            )}
            style={
                isMac
                    ? { height: `${MAC_TITLE_BAR_HEIGHT_PX}px` }
                    : undefined
            }
        >
            {isMac && (
                <div
                    className="wails-drag shrink-0 self-stretch"
                    style={{ width: `${MAC_TRAFFIC_LIGHT_GUTTER_PX}px` }}
                    aria-hidden
                />
            )}

            {isUnlocked && showSidebarColumn && (
                <div className="relative flex h-full w-14 shrink-0 flex-col items-center justify-center">
                    <img
                        src="/appicon.png"
                        alt="Terminator"
                        className="size-5"
                    />
                </div>
            )}

            <div
                ref={scrollRef}
                onWheel={handleWheel}
                className="flex h-full flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden pl-2 [&::-webkit-scrollbar]:hidden"
            >
                {sessions.map((session) => (
                    <TerminalTab
                        key={session.id}
                        session={session}
                        isActive={
                            isTerminalView && session.id === activeSessionId
                        }
                        onClick={() => setActiveSession(session.id)}
                        onClose={() => removeSession(session.id)}
                    />
                ))}
            </div>

            {usesCustomWindowControls && (
                <WindowControls className="ml-2 shrink-0" />
            )}
        </header>
    );
}
