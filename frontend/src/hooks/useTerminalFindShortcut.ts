import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { useTerminalFindStore } from "@/store/terminalFindStore";
import {
    isTerminalFindInput,
    isTerminalFindShortcut,
    isTypingTarget,
} from "@/lib/keyboardShortcuts";

export function useTerminalFindShortcut() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const activeView = useUIStore((s) => s.activeView);
    const toggle = useTerminalFindStore((s) => s.toggle);
    const close = useTerminalFindStore((s) => s.close);

    useEffect(() => {
        if (activeView !== ViewType.Terminal) {
            close();
        }
    }, [activeView, close]);

    useEffect(() => {
        if (!isUnlocked || activeView !== ViewType.Terminal) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isTerminalFindShortcut(event)) {
                return;
            }
            if (isTypingTarget(event.target) && !isTerminalFindInput(event.target)) {
                return;
            }

            event.preventDefault();
            toggle();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeView, isUnlocked, toggle]);
}
