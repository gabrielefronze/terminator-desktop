import type { ITerminalOptions } from "@xterm/xterm";
import type { AppSettings } from "../../bindings/terminator-desktop/backend/internal/services/settings";
import { formatFontFamilyForTerminal } from "@/lib/terminalFont";

export { DEFAULT_TERMINAL_FONT_NAME as DEFAULT_TERMINAL_FONT_FAMILY } from "@/lib/terminalFont";
export const DEFAULT_TERMINAL_FONT_SIZE = 14;

const BASE_TERMINAL_OPTIONS = {
    cursorBlink: true,
    theme: {
        background: "#09090b",
        foreground: "#fafafa",
        cursor: "#fafafa",
        selectionBackground: "rgba(250, 250, 250, 0.3)",
    },
    allowProposedApi: true,
} satisfies Partial<ITerminalOptions>;

export function resolveTerminalFontFamily(
    settings?: AppSettings | null,
): string {
    return formatFontFamilyForTerminal(settings?.terminalFontFamily);
}

export function resolveTerminalFontSize(settings?: AppSettings | null): number {
    const size = settings?.terminalFontSize;
    if (!size || size <= 0) {
        return DEFAULT_TERMINAL_FONT_SIZE;
    }
    return Math.min(32, Math.max(8, size));
}

export function buildTerminalOptions(
    settings?: AppSettings | null,
): ITerminalOptions {
    return {
        ...BASE_TERMINAL_OPTIONS,
        fontFamily: resolveTerminalFontFamily(settings),
        fontSize: resolveTerminalFontSize(settings),
    };
}

/** @deprecated Use buildTerminalOptions(settings) */
export const TERMINAL_THEME = buildTerminalOptions();
