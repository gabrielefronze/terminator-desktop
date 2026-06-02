import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import {
    isCloseTabShortcut,
    isDisconnectSessionShortcut,
    isNextTabShortcut,
    isPrevTabShortcut,
    shouldBypassGlobalShortcuts,
} from "@/lib/keyboardShortcuts";
import {
    closeTitleBarTab,
    getAdjacentTitleBarSessionId,
    resolveTitleBarLeaderId,
} from "@/lib/sessionTabs";

export function useTabShortcuts() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const activeView = useUIStore((s) => s.activeView);
    const isCommandPaletteOpen = useUIStore((s) => s.isCommandPaletteOpen);
    const isNewTabHostPickerOpen = useUIStore((s) => s.isNewTabHostPickerOpen);
    const isShortcutsOverlayOpen = useUIStore((s) => s.isShortcutsOverlayOpen);

    const sessions = useSessionStore((s) => s.sessions);
    const activeSessionId = useSessionStore((s) => s.activeSessionId);
    const removeSession = useSessionStore((s) => s.removeSession);
    const closeTileGroup = useSessionStore((s) => s.closeTileGroup);
    const setActiveSession = useSessionStore((s) => s.setActiveSession);
    const requestDisconnect = useSessionStore((s) => s.requestDisconnect);

    useEffect(() => {
        if (!isUnlocked) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (
                isCommandPaletteOpen ||
                isNewTabHostPickerOpen ||
                isShortcutsOverlayOpen
            ) {
                return;
            }
            if (shouldBypassGlobalShortcuts(event.target)) {
                return;
            }

            const isTerminalView = activeView === ViewType.Terminal;
            const hasSessions = sessions.length > 0;

            if (isCloseTabShortcut(event) && hasSessions) {
                const leaderId = resolveTitleBarLeaderId(
                    sessions,
                    activeSessionId,
                );
                if (!leaderId) {
                    return;
                }
                event.preventDefault();
                closeTitleBarTab(
                    sessions,
                    leaderId,
                    removeSession,
                    closeTileGroup,
                );
                return;
            }

            if (!isTerminalView || !hasSessions) {
                return;
            }

            if (isNextTabShortcut(event)) {
                const nextId = getAdjacentTitleBarSessionId(
                    sessions,
                    activeSessionId,
                    "next",
                );
                if (!nextId) {
                    return;
                }
                event.preventDefault();
                setActiveSession(nextId);
                return;
            }

            if (isPrevTabShortcut(event)) {
                const prevId = getAdjacentTitleBarSessionId(
                    sessions,
                    activeSessionId,
                    "prev",
                );
                if (!prevId) {
                    return;
                }
                event.preventDefault();
                setActiveSession(prevId);
                return;
            }

            if (isDisconnectSessionShortcut(event) && activeSessionId) {
                const active = sessions.find(
                    (session) => session.id === activeSessionId,
                );
                if (
                    !active ||
                    active.forwardOnly ||
                    active.config.local
                ) {
                    return;
                }
                event.preventDefault();
                requestDisconnect(activeSessionId);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        activeSessionId,
        activeView,
        closeTileGroup,
        isCommandPaletteOpen,
        isNewTabHostPickerOpen,
        isShortcutsOverlayOpen,
        isUnlocked,
        removeSession,
        requestDisconnect,
        sessions,
        setActiveSession,
    ]);
}
