import type { ISearchOptions } from "@xterm/addon-search";
import type { SearchAddon } from "@xterm/addon-search";

/** xterm SearchAddon requires #RRGGBB colors for match highlights. */
export const TERMINAL_FIND_DECORATIONS = {
    matchBackground: "#854d0e",
    matchBorder: "#ca8a04",
    matchOverviewRuler: "#ca8a04",
    activeMatchBackground: "#a16207",
    activeMatchBorder: "#facc15",
    activeMatchColorOverviewRuler: "#facc15",
} as const;

export function buildTerminalFindOptions(
    direction: "next" | "previous",
): ISearchOptions {
    return {
        caseSensitive: false,
        regex: false,
        wholeWord: false,
        incremental: direction === "next",
        decorations: TERMINAL_FIND_DECORATIONS,
    };
}

export function runTerminalFind(
    searchAddon: SearchAddon | null,
    query: string,
    direction: "next" | "previous",
): boolean {
    if (!searchAddon || !query.trim()) {
        searchAddon?.clearDecorations();
        return false;
    }

    return direction === "next"
        ? searchAddon.findNext(query, buildTerminalFindOptions("next"))
        : searchAddon.findPrevious(query, buildTerminalFindOptions("previous"));
}
