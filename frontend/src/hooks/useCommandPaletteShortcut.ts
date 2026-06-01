import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import {
    isCommandPaletteShortcut,
    isTypingTarget,
} from "@/lib/keyboardShortcuts";

export function useCommandPaletteShortcut() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const toggleCommandPalette = useUIStore((s) => s.toggleCommandPalette);

    useEffect(() => {
        if (!isUnlocked) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isCommandPaletteShortcut(event)) {
                return;
            }
            if (isTypingTarget(event.target)) {
                return;
            }

            event.preventDefault();
            toggleCommandPalette();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isUnlocked, toggleCommandPalette]);
}
