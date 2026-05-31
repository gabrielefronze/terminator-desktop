import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { isNewTabShortcut, isTypingTarget } from "@/lib/keyboardShortcuts";

export function useNewTabShortcut() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const isOpen = useUIStore((s) => s.isNewTabHostPickerOpen);
    const openNewTabHostPicker = useUIStore((s) => s.openNewTabHostPicker);

    useEffect(() => {
        if (!isUnlocked) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isNewTabShortcut(event)) return;
            if (isTypingTarget(event.target)) return;
            if (isOpen) return;

            event.preventDefault();
            openNewTabHostPicker();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isUnlocked, isOpen, openNewTabHostPicker]);
}
