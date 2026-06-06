import { Terminal } from "@xterm/xterm";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { SettingsService } from "../../bindings/terminator-desktop/backend/internal/services/settings";
import type { TerminalFontFace } from "../../bindings/terminator-desktop/backend/internal/services/settings/models";
import {
    DEFAULT_TERMINAL_FONT_NAME,
    parseStoredFontFamily,
} from "@/lib/terminalFont";

const FONT_FACE_STYLE_ID = "terminator-terminal-font-face";

export function applyUnicode11Addon(term: Terminal): void {
    const unicode11 = new Unicode11Addon();
    term.loadAddon(unicode11);
    term.unicode.activeVersion = "11";
}

export function injectTerminalFontFace(css: string): void {
    let el = document.getElementById(FONT_FACE_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
        el = document.createElement("style");
        el.id = FONT_FACE_STYLE_ID;
        document.head.appendChild(el);
    }
    el.textContent = css;
}

export async function resolveTerminalFontFamily(
    storedFamily?: string | null,
): Promise<string> {
    const family = parseStoredFontFamily(storedFamily);

    try {
        const face: TerminalFontFace =
            await SettingsService.BuildTerminalFontFace(family);
        if (face.css) {
            injectTerminalFontFace(face.css);
        }
        if (face.family) {
            await document.fonts.load(`16px ${face.family}`);
            return face.family;
        }
    } catch {
        // Fall back to CSS family name only.
    }

    const fallback = `"${family || DEFAULT_TERMINAL_FONT_NAME}", monospace`;
    try {
        await document.fonts.load(`16px ${fallback}`);
    } catch {
        // System font may still render without explicit load.
    }
    return fallback;
}

export async function resolveSessionTerminalFontFamily(
    settingsFamily?: string | null,
    hostFamily?: string | null,
): Promise<string> {
    const host = hostFamily?.trim();
    return resolveTerminalFontFamily(host || settingsFamily);
}
