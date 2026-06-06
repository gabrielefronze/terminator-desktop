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

export const TERMINAL_BACKGROUND =
    BASE_TERMINAL_OPTIONS.theme.background ?? "#09090b";

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
    return clampTerminalFontSize(size);
}

export function clampTerminalFontSize(size: number): number {
    return Math.min(32, Math.max(8, Math.round(size)));
}

export type HostTerminalOverrides = {
    terminalFontFamily?: string;
    terminalFontSize?: number;
};

export function buildTerminalOptions(
    settings?: AppSettings | null,
    hostOverrides?: HostTerminalOverrides | null,
): ITerminalOptions {
    const hostFontSize = hostOverrides?.terminalFontSize;
    const fontSize =
        hostFontSize && hostFontSize > 0
            ? clampTerminalFontSize(hostFontSize)
            : resolveTerminalFontSize(settings);

    const hostFont = hostOverrides?.terminalFontFamily?.trim();
    const fontFamily = hostFont
        ? formatFontFamilyForTerminal(undefined, hostFont)
        : resolveTerminalFontFamily(settings);

    return {
        ...BASE_TERMINAL_OPTIONS,
        fontFamily,
        fontSize,
    };
}

/** @deprecated Use buildTerminalOptions(settings) */
export const TERMINAL_THEME = buildTerminalOptions();
