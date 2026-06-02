import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import {
    isShortcutsHelpShortcut,
    shouldBypassGlobalShortcuts,
} from "@/lib/keyboardShortcuts";

export function useShortcutsHelpShortcut() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const isCommandPaletteOpen = useUIStore((s) => s.isCommandPaletteOpen);
    const isNewTabHostPickerOpen = useUIStore((s) => s.isNewTabHostPickerOpen);
    const toggleShortcutsOverlay = useUIStore((s) => s.toggleShortcutsOverlay);

    useEffect(() => {
        if (!isUnlocked) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isShortcutsHelpShortcut(event)) {
                return;
            }
            if (isCommandPaletteOpen || isNewTabHostPickerOpen) {
                return;
            }
            if (shouldBypassGlobalShortcuts(event.target)) {
                return;
            }

            event.preventDefault();
            toggleShortcutsOverlay();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        isCommandPaletteOpen,
        isNewTabHostPickerOpen,
        isUnlocked,
        toggleShortcutsOverlay,
    ]);
}
