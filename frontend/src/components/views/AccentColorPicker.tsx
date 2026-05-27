import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    ACCENT_COLOR_OPTIONS,
    DEFAULT_ACCENT_COLOR,
    normalizeAccentColor,
} from "@/lib/accentTheme";

interface AccentColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    onReset?: () => void;
}

export function AccentColorPicker({
    value,
    onChange,
    onReset,
}: AccentColorPickerProps) {
    const { t } = useTranslation("settings");
    const selected = normalizeAccentColor(value);

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
                {ACCENT_COLOR_OPTIONS.map(({ value: preset, label }) => {
                    const active =
                        selected.toLowerCase() === preset.toLowerCase();
                    return (
                        <button
                            key={preset}
                            type="button"
                            title={label}
                            onClick={() => onChange(preset)}
                            className={cn(
                                "size-8 rounded-full border-2 transition-transform",
                                active
                                    ? "scale-110 border-foreground"
                                    : "border-transparent hover:scale-105",
                            )}
                            style={{ backgroundColor: preset }}
                        />
                    );
                })}
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-2">
                    <Label
                        htmlFor="accent-color"
                        className="text-xs text-muted-foreground"
                    >
                        {t("accent_color_custom_label")}
                    </Label>
                    <div className="flex items-center gap-2">
                        <input
                            id="accent-color"
                            type="color"
                            value={selected}
                            onChange={(e) => onChange(e.target.value)}
                            className="size-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                        />
                        <span className="font-mono text-xs text-muted-foreground">
                            {selected}
                        </span>
                    </div>
                </div>

                {onReset && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0"
                        onClick={onReset}
                    >
                        {t("accent_color_reset_btn")}
                    </Button>
                )}
            </div>

            <div className="flex items-center gap-3">
                <div
                    className="h-9 flex-1 rounded-lg bg-primary"
                    aria-hidden
                />
                <Button type="button" size="sm" className="pointer-events-none">
                    {t("accent_color_preview_btn")}
                </Button>
            </div>
        </div>
    );
}

export { DEFAULT_ACCENT_COLOR };
