import { applyAppBackgroundColor } from "@/lib/appTheme";
import { applyAccentColor } from "@/lib/accentTheme";

export function applyAppTheme(
    backgroundColor?: string | null,
    accentColor?: string | null,
): void {
    applyAppBackgroundColor(backgroundColor);
    applyAccentColor(accentColor);
}
