/** Default matches :root --background in main.css (#09090b ≈ zinc-950). */
export const DEFAULT_APP_BACKGROUND_COLOR = "#09090b";

/** Hue used when the background is near-neutral (matches main.css zinc). */
const DEFAULT_GREY_HUE = 285.823;

/** Lightness steps relative to background (from shadcn zinc dark theme). */
const SURFACE_LIFT = 0.069;
const MUTED_LIFT = 0.133;
const RING_LIGHTNESS = 0.552;
const MUTED_FG_LIGHTNESS = 0.705;
export const APP_BACKGROUND_OPTIONS: { value: string; label: string }[] = [
    { value: "#09090b", label: "Zinc" },
    { value: "#0a0a0a", label: "Neutral" },
    { value: "#0f172a", label: "Slate" },
    { value: "#111827", label: "Gray" },
    { value: "#0c1222", label: "Navy" },
    { value: "#1e1b4b", label: "Indigo" },
    { value: "#14532d", label: "Forest" },
    { value: "#1c1917", label: "Stone" },
    { value: "#3f1414", label: "Wine" },
    { value: "#171717", label: "Charcoal" },
];

const presetValues = new Set(APP_BACKGROUND_OPTIONS.map((c) => c.value.toLowerCase()));

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** CSS variables derived from the app background color. */
export const APP_THEME_CSS_VARS = [
    "background",
    "card",
    "popover",
    "secondary",
    "muted",
    "accent",
    "accent-foreground",
    "muted-foreground",
    "border",
    "input",
    "sidebar",
    "sidebar-accent",
    "sidebar-accent-foreground",
    "sidebar-border",
    "sidebar-ring",
    "host-card",
    "group-card",
] as const;

export interface OklchColor {
    l: number;
    c: number;
    h: number;
}

export interface DerivedAppTheme {
    background: string;
    vars: Record<(typeof APP_THEME_CSS_VARS)[number], string>;
}

export function normalizeHexColor(
    color: string | null | undefined,
    fallback: string,
    presets?: Set<string>,
): string {
    const trimmed = color?.trim();
    if (!trimmed) {
        return fallback;
    }
    if (HEX_COLOR.test(trimmed)) {
        return trimmed.length === 4 ? expandShortHex(trimmed) : trimmed;
    }
    if (presets?.has(trimmed.toLowerCase())) {
        return trimmed;
    }
    return fallback;
}

export function normalizeAppBackgroundColor(color?: string | null): string {
    return normalizeHexColor(color, DEFAULT_APP_BACKGROUND_COLOR, presetValues);
}

function expandShortHex(hex: string): string {
    const r = hex[1];
    const g = hex[2];
    const b = hex[3];
    return `#${r}${r}${g}${g}${b}${b}`;
}

export function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

export function formatOklch({ l, c, h }: OklchColor, alpha?: number): string {
    const L = round(l, 3);
    const C = round(c, 4);
    const H = round(h, 3);
    if (alpha === undefined) {
        return `oklch(${L} ${C} ${H})`;
    }
    const A = round(alpha, 3);
    return `oklch(${L} ${C} ${H} / ${A})`;
}

function round(value: number, digits: number): number {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
}

export function hexToOklch(hex: string, fallback = DEFAULT_APP_BACKGROUND_COLOR): OklchColor {
    const normalized = normalizeHexColor(hex, fallback);
    const [r, g, b] = hexToRgb(normalized);
    const lr = srgbToLinear(r);
    const lg = srgbToLinear(g);
    const lb = srgbToLinear(b);

    const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
    const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
    const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

    const l = Math.cbrt(l_);
    const m = Math.cbrt(m_);
    const s = Math.cbrt(s_);

    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const b_ = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

    const c = Math.hypot(a, b_);
    let h = (Math.atan2(b_, a) * 180) / Math.PI;
    if (h < 0) {
        h += 360;
    }

    return { l: L, c, h };
}

function hexToRgb(hex: string): [number, number, number] {
    const body = hex.slice(1);
    const value = Number.parseInt(body, 16);
    return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function srgbToLinear(channel: number): number {
    return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
}

function themeHue(base: OklchColor): number {
    if (base.c < 0.02) {
        return DEFAULT_GREY_HUE;
    }
    return base.h;
}

function themeChroma(base: OklchColor): number {
    return Math.max(base.c, 0.005);
}

export function buildDerivedAppTheme(hex: string): DerivedAppTheme {
    const normalized = normalizeAppBackgroundColor(hex);
    const base = hexToOklch(normalized);
    const h = themeHue(base);
    const chroma = themeChroma(base);

    const background = formatOklch(base);
    const surface = formatOklch({
        l: clamp01(base.l + SURFACE_LIFT),
        c: chroma * 1.2,
        h,
    });
    const muted = formatOklch({
        l: clamp01(base.l + MUTED_LIFT),
        c: chroma * 1.2,
        h,
    });
    const mutedForeground = formatOklch({
        l: MUTED_FG_LIGHTNESS,
        c: Math.max(chroma * 3, 0.015),
        h,
    });
    const border = formatOklch(
        { l: 0.78, c: Math.max(chroma * 0.6, 0.008), h },
        0.12,
    );
    const input = formatOklch(
        { l: 0.78, c: Math.max(chroma * 0.6, 0.008), h },
        0.15,
    );

    const vars: DerivedAppTheme["vars"] = {
        background,
        card: surface,
        popover: surface,
        secondary: muted,
        muted,
        accent: muted,
        "accent-foreground": formatOklch({ l: 0.985, c: 0, h: 0 }),
        "muted-foreground": mutedForeground,
        border,
        input,
        sidebar: surface,
        "sidebar-accent": muted,
        "sidebar-accent-foreground": formatOklch({ l: 0.985, c: 0, h: 0 }),
        "sidebar-border": border,
        "sidebar-ring": formatOklch({
            l: RING_LIGHTNESS,
            c: Math.max(chroma * 3.2, 0.016),
            h,
        }),
        "host-card": surface,
        "group-card": background,
    };

    return { background, vars };
}

export function applyAppBackgroundColor(color?: string | null): void {
    const resolved = normalizeAppBackgroundColor(color);
    const theme = buildDerivedAppTheme(resolved);
    const root = document.documentElement;

    for (const name of APP_THEME_CSS_VARS) {
        root.style.setProperty(`--${name}`, theme.vars[name]);
    }
}

export function clearAppBackgroundOverride(): void {
    const root = document.documentElement;
    for (const name of APP_THEME_CSS_VARS) {
        root.style.removeProperty(`--${name}`);
    }
}
