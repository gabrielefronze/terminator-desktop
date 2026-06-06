/** Plain family name stored in settings and shown in the font picker. */
export const DEFAULT_TERMINAL_FONT_NAME = "Fira Code";

/** Parses stored settings value (plain name or legacy CSS stack). */
export function parseStoredFontFamily(stored?: string | null): string {
    if (!stored?.trim()) {
        return DEFAULT_TERMINAL_FONT_NAME;
    }

    const trimmed = stored.trim();
    const quoted = trimmed.match(/^"([^"]+)"/);
    if (quoted) {
        return quoted[1];
    }

    if (trimmed.includes(",")) {
        const first = trimmed.split(",")[0]?.trim() ?? "";
        return first.replace(/^"|"$/g, "") || DEFAULT_TERMINAL_FONT_NAME;
    }

    return trimmed;
}

export function effectiveTerminalFontFamily(
    settingsFamily?: string | null,
    hostFamily?: string | null,
): string {
    const host = hostFamily?.trim();
    if (host) {
        return parseStoredFontFamily(host);
    }
    return parseStoredFontFamily(settingsFamily);
}

/** Builds the CSS font-family value used by xterm. */
export function formatFontFamilyForTerminal(
    stored?: string | null,
    hostFamily?: string | null,
): string {
    const name = effectiveTerminalFontFamily(stored, hostFamily);
    return `"${name}", monospace`;
}

export function fontFamilyPreviewCss(family: string): string {
    return formatFontFamilyForTerminal(family);
}
