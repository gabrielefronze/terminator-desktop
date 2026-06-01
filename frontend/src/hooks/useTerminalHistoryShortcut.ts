import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";
import { useTerminalHistoryStore } from "@/store/terminalHistoryStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import {
    isTerminalCommandHistoryShortcut,
    isTypingTarget,
} from "@/lib/keyboardShortcuts";

export function useTerminalHistoryShortcut() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const activeView = useUIStore((s) => s.activeView);
    const activeSessionId = useSessionStore((s) => s.activeSessionId);
    const open = useTerminalHistoryStore((s) => s.open);

    useEffect(() => {
        if (!isUnlocked || activeView !== ViewType.Terminal || !activeSessionId) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isTerminalCommandHistoryShortcut(event)) {
                return;
            }
            if (isTypingTarget(event.target)) {
                return;
            }

            event.preventDefault();
            open("local");
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeSessionId, activeView, isUnlocked, open]);
}
