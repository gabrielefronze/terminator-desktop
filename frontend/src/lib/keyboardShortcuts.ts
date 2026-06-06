export function isTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return true;
    }
    return target.isContentEditable;
}

/** Mac: ⌘+key. Windows/Linux: Ctrl+Shift+key (avoids browser Ctrl clashes). */
export function isModShortcut(event: KeyboardEvent, key: string): boolean {
    if (event.altKey || event.key.toLowerCase() !== key.toLowerCase()) {
        return false;
    }
    if (event.metaKey) {
        return !event.shiftKey;
    }
    if (event.ctrlKey) {
        return event.shiftKey;
    }
    return false;
}

export function isNewTabShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "t");
}

export function isCommandPaletteShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "k");
}

export function isTerminalFindShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "f");
}

export function isTerminalCommandHistoryShortcut(event: KeyboardEvent): boolean {
    return (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "r"
    );
}

export function isTerminalFindInput(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        target.dataset.terminalFindInput === "true"
    );
}

export function isToggleSidebarShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "b");
}

export function isCloseTabShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "w");
}

export function isDisconnectSessionShortcut(event: KeyboardEvent): boolean {
    return (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        event.shiftKey &&
        event.key.toLowerCase() === "d"
    );
}

export function isNextTabShortcut(event: KeyboardEvent): boolean {
    if (event.altKey) {
        return false;
    }
    // Mac: Control+Tab
    if (
        event.key === "Tab" &&
        event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
    ) {
        return true;
    }
    // Mac: ⌘⇧] — Windows/Linux: Ctrl+Shift+]
    if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        (event.key === "]" || event.code === "BracketRight")
    ) {
        return true;
    }
    if (
        event.metaKey &&
        event.altKey &&
        (event.key === "ArrowRight" || event.code === "ArrowRight")
    ) {
        return true;
    }
    return false;
}

export function isPrevTabShortcut(event: KeyboardEvent): boolean {
    // Mac: Control+Shift+Tab
    if (
        event.key === "Tab" &&
        event.ctrlKey &&
        !event.metaKey &&
        event.shiftKey &&
        !event.altKey
    ) {
        return true;
    }
    // Mac: ⌘⇧[ — Windows/Linux: Ctrl+Shift+[
    if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        !event.altKey &&
        (event.key === "[" || event.code === "BracketLeft")
    ) {
        return true;
    }
    if (
        event.metaKey &&
        event.altKey &&
        (event.key === "ArrowLeft" || event.code === "ArrowLeft")
    ) {
        return true;
    }
    return false;
}

export function isShortcutsHelpShortcut(event: KeyboardEvent): boolean {
    if (event.metaKey || event.ctrlKey || event.altKey) {
        return false;
    }
    return event.key === "?";
}

export function shouldBypassGlobalShortcuts(
    target: EventTarget | null,
    options?: { allowWhileTyping?: boolean },
): boolean {
    if (!options?.allowWhileTyping && isTypingTarget(target)) {
        return true;
    }
    if (isTerminalFindInput(target)) {
        return true;
    }
    return false;
}

export interface KeyboardShortcutItem {
    /** i18n key under shortcuts:actions */
    actionKey: string;
    mac: string;
    windows: string;
}

export interface KeyboardShortcutCategory {
    /** i18n key under shortcuts:categories */
    categoryKey: string;
    items: KeyboardShortcutItem[];
}

export const KEYBOARD_SHORTCUT_CATEGORIES: KeyboardShortcutCategory[] = [
    {
        categoryKey: "general",
        items: [
            { actionKey: "command_palette", mac: "⌘K", windows: "Ctrl+Shift+K" },
            { actionKey: "shortcuts_help", mac: "?", windows: "?" },
            { actionKey: "toggle_sidebar", mac: "⌘B", windows: "Ctrl+Shift+B" },
        ],
    },
    {
        categoryKey: "tabs",
        items: [
            { actionKey: "new_tab", mac: "⌘T", windows: "Ctrl+Shift+T" },
            { actionKey: "close_tab", mac: "⌘W", windows: "Ctrl+Shift+W" },
            {
                actionKey: "next_tab",
                mac: "⌃Tab / ⌘⇧]",
                windows: "Ctrl+Shift+]",
            },
            {
                actionKey: "prev_tab",
                mac: "⌃⇧Tab / ⌘⇧[",
                windows: "Ctrl+Shift+[",
            },
            { actionKey: "disconnect", mac: "⌘⇧D", windows: "Ctrl+Shift+D" },
        ],
    },
    {
        categoryKey: "terminal",
        items: [
            { actionKey: "find", mac: "⌘F", windows: "Ctrl+Shift+F" },
            { actionKey: "command_history", mac: "⌘⇧R", windows: "Ctrl+Shift+R" },
            { actionKey: "zoom_in", mac: "⌘+", windows: "Ctrl+Shift++" },
            { actionKey: "zoom_out", mac: "⌘−", windows: "Ctrl+Shift+−" },
        ],
    },
    {
        categoryKey: "hosts",
        items: [
            {
                actionKey: "quick_connect",
                mac: "Enter",
                windows: "Enter",
            },
        ],
    },
];

export function shortcutDisplayLabel(
    item: KeyboardShortcutItem,
    isMac: boolean,
): string {
    return isMac ? item.mac : item.windows;
}

type ShortcutKeyEvent = Pick<
    KeyboardEvent,
    "metaKey" | "ctrlKey" | "altKey" | "shiftKey" | "key" | "code"
>;

function isWindowsCtrlShortcut(event: ShortcutKeyEvent): boolean {
    return event.ctrlKey && !event.metaKey;
}

export function isTerminalZoomInShortcut(event: ShortcutKeyEvent): boolean {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return false;
    }
    if (isWindowsCtrlShortcut(event) && !event.shiftKey) {
        return false;
    }
    return (
        event.key === "=" ||
        event.key === "+" ||
        event.code === "Equal" ||
        event.code === "NumpadAdd"
    );
}

export function isTerminalZoomOutShortcut(event: ShortcutKeyEvent): boolean {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
        return false;
    }
    if (isWindowsCtrlShortcut(event)) {
        if (!event.shiftKey) {
            return false;
        }
    } else if (event.shiftKey) {
        return false;
    }
    return (
        event.key === "-" ||
        event.code === "Minus" ||
        event.code === "NumpadSubtract"
    );
}
