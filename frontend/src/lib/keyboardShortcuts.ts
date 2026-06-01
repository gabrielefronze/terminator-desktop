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

export function isModShortcut(event: KeyboardEvent, key: string): boolean {
    return (
        (event.metaKey || event.ctrlKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === key.toLowerCase()
    );
}

export function isNewTabShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "t");
}

export function isCommandPaletteShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "k");
}

export function isToggleSidebarShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "b");
}

type ShortcutKeyEvent = Pick<
    KeyboardEvent,
    "metaKey" | "ctrlKey" | "altKey" | "shiftKey" | "key" | "code"
>;

export function isTerminalZoomInShortcut(event: ShortcutKeyEvent): boolean {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
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
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
        return false;
    }
    return (
        event.key === "-" ||
        event.code === "Minus" ||
        event.code === "NumpadSubtract"
    );
}
