import { WebglAddon } from "@xterm/addon-webgl";
import type { Terminal } from "@xterm/xterm";

export type TerminalWebglAddon = WebglAddon;

export function loadTerminalWebglAddon(term: Terminal): TerminalWebglAddon | null {
    try {
        const addon = new WebglAddon();
        addon.onContextLoss(() => {
            addon.dispose();
        });
        term.loadAddon(addon);
        return addon;
    } catch (error) {
        console.warn("WebGL terminal renderer unavailable, using canvas:", error);
        return null;
    }
}

export function disposeTerminalWebglAddon(
    addon: TerminalWebglAddon | null | undefined,
): void {
    addon?.dispose();
}

export function syncTerminalWebglRenderer(
    term: Terminal,
    addonRef: { current: TerminalWebglAddon | null },
    enabled: boolean,
): void {
    if (enabled) {
        if (!addonRef.current) {
            addonRef.current = loadTerminalWebglAddon(term);
        }
        return;
    }

    disposeTerminalWebglAddon(addonRef.current);
    addonRef.current = null;
}
