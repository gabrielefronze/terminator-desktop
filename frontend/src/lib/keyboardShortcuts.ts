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

export function isToggleSidebarShortcut(event: KeyboardEvent): boolean {
    return isModShortcut(event, "b");
}
