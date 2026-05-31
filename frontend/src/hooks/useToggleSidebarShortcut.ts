import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";
import { isToggleSidebarShortcut, isTypingTarget } from "@/lib/keyboardShortcuts";

export function useToggleSidebarShortcut() {
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const toggleSidebar = useUIStore((s) => s.toggleSidebar);

    useEffect(() => {
        if (!isUnlocked) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (!isToggleSidebarShortcut(event)) return;
            if (isTypingTarget(event.target)) return;

            event.preventDefault();
            toggleSidebar();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isUnlocked, toggleSidebar]);
}
