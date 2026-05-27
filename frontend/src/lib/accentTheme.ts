import {
    clamp01,
    formatOklch,
    hexToOklch,
    normalizeHexColor,
    type OklchColor,
} from "@/lib/appTheme";

/** Default indigo accent (matches main.css --sidebar-primary). */
export const DEFAULT_ACCENT_COLOR = "#6366f1";

export const ACCENT_COLOR_OPTIONS: { value: string; label: string }[] = [
    { value: "#6366f1", label: "Indigo" },
    { value: "#3b82f6", label: "Blue" },
    { value: "#8b5cf6", label: "Violet" },
    { value: "#06b6d4", label: "Cyan" },
    { value: "#22c55e", label: "Green" },
    { value: "#eab308", label: "Amber" },
    { value: "#f97316", label: "Orange" },
    { value: "#f43f5e", label: "Rose" },
    { value: "#ec4899", label: "Pink" },
    { value: "#a3a3a3", label: "Silver" },
];

const accentPresetValues = new Set(
    ACCENT_COLOR_OPTIONS.map((c) => c.value.toLowerCase()),
);

export const ACCENT_THEME_CSS_VARS = [
    "primary",
    "primary-foreground",
    "sidebar-primary",
    "sidebar-primary-foreground",
    "ring",
] as const;

export type AccentThemeVars = Record<(typeof ACCENT_THEME_CSS_VARS)[number], string>;

export function normalizeAccentColor(color?: string | null): string {
    return normalizeHexColor(color, DEFAULT_ACCENT_COLOR, accentPresetValues);
}

function contrastingForeground(accent: OklchColor): string {
    if (accent.l > 0.62) {
        return formatOklch({
            l: 0.2,
            c: Math.min(accent.c * 0.4, 0.04),
            h: accent.h,
        });
    }
    return formatOklch({ l: 0.98, c: 0, h: 0 });
}

export function buildAccentThemeVars(hex: string): AccentThemeVars {
    const base = hexToOklch(normalizeAccentColor(hex), DEFAULT_ACCENT_COLOR);
    const chroma = Math.max(base.c, 0.14);
    const lightness = clamp01(base.l < 0.35 ? 0.55 : base.l > 0.75 ? 0.62 : base.l);

    const primary = formatOklch({
        l: lightness,
        c: chroma,
        h: base.h,
    });
    const primaryForeground = contrastingForeground({ ...base, l: lightness, c: chroma });
    const ring = formatOklch({
        l: clamp01(lightness + 0.12),
        c: chroma * 0.85,
        h: base.h,
    });

    return {
        primary,
        "primary-foreground": primaryForeground,
        "sidebar-primary": primary,
        "sidebar-primary-foreground": primaryForeground,
        ring,
    };
}

export function applyAccentColor(color?: string | null): void {
    const vars = buildAccentThemeVars(normalizeAccentColor(color));
    const root = document.documentElement;

    for (const name of ACCENT_THEME_CSS_VARS) {
        root.style.setProperty(`--${name}`, vars[name]);
    }
}

export function clearAccentOverride(): void {
    const root = document.documentElement;
    for (const name of ACCENT_THEME_CSS_VARS) {
        root.style.removeProperty(`--${name}`);
    }
}
