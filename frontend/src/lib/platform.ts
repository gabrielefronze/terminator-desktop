export type PlatformOS = "darwin" | "windows" | "linux" | "unknown";

/** Left inset for native macOS traffic lights (hidden inset title bar). */
export const MAC_TRAFFIC_LIGHT_GUTTER_PX = 78;

/** Matches `InvisibleTitleBarHeight` in main.go on macOS. */
export const MAC_TITLE_BAR_HEIGHT_PX = 38;

function osFromWails(): PlatformOS | null {
    const os = window._wails?.environment?.OS?.toLowerCase();
    return normalizePlatformOS(os);
}

function osFromNavigator(): PlatformOS | null {
    if (typeof navigator === "undefined") {
        return null;
    }
    const platform = navigator.platform?.toLowerCase() ?? "";
    const userAgent = navigator.userAgent?.toLowerCase() ?? "";
    if (platform.includes("mac") || userAgent.includes("mac")) {
        return "darwin";
    }
    if (platform.includes("win") || userAgent.includes("win")) {
        return "windows";
    }
    if (platform.includes("linux") || userAgent.includes("linux")) {
        return "linux";
    }
    return null;
}

export function normalizePlatformOS(os?: string | null): PlatformOS | null {
    if (!os) {
        return null;
    }
    const value = os.toLowerCase();
    if (value === "darwin" || value === "macos") {
        return "darwin";
    }
    if (value === "windows") {
        return "windows";
    }
    if (value === "linux") {
        return "linux";
    }
    return null;
}

export function detectPlatformOS(): PlatformOS {
    return osFromWails() ?? osFromNavigator() ?? "unknown";
}

/** True when running in the desktop app on macOS (native traffic-light window controls). */
export function isMac(): boolean {
    return detectPlatformOS() === "darwin";
}

export function isWindows(): boolean {
    return detectPlatformOS() === "windows";
}

export function isLinux(): boolean {
    return detectPlatformOS() === "linux";
}

/** Custom in-app window controls (min/max/close) for frameless non-macOS windows. */
export function usesCustomWindowControls(): boolean {
    return !isMac();
}
