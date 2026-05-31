import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import {
    isTerminalZoomInShortcut,
    isTerminalZoomOutShortcut,
    isTypingTarget,
} from "@/lib/keyboardShortcuts";
import { adjustTerminalFontSize } from "@/lib/terminalFontSizeAdjust";
import { handleAppError } from "@/lib/error";

export function useTerminalFontSizeShortcut() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const activeView = useUIStore((s) => s.activeView);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!isUnlocked || activeView !== ViewType.Terminal) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (isTypingTarget(event.target)) {
                return;
            }

            const delta = isTerminalZoomInShortcut(event)
                ? 1
                : isTerminalZoomOutShortcut(event)
                  ? -1
                  : 0;
            if (delta === 0) {
                return;
            }

            event.preventDefault();
            void adjustTerminalFontSize(delta, queryClient).catch(handleAppError);
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [activeView, isUnlocked, queryClient]);
}
