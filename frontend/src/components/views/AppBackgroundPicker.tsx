import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    APP_BACKGROUND_OPTIONS,
    DEFAULT_APP_BACKGROUND_COLOR,
    normalizeAppBackgroundColor,
} from "@/lib/appTheme";

interface AppBackgroundPickerProps {
    value: string;
    onChange: (color: string) => void;
    onReset?: () => void;
}

export function AppBackgroundPicker({
    value,
    onChange,
    onReset,
}: AppBackgroundPickerProps) {
    const { t } = useTranslation("settings");
    const selected = normalizeAppBackgroundColor(value);

    return (
        <div className="grid gap-4">
            <div className="flex flex-wrap gap-2">
                {APP_BACKGROUND_OPTIONS.map(({ value: preset, label }) => {
                    const active = selected.toLowerCase() === preset.toLowerCase();
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
                        htmlFor="app-background-color"
                        className="text-xs text-muted-foreground"
                    >
                        {t("app_background_custom_label")}
                    </Label>
                    <div className="flex items-center gap-2">
                        <input
                            id="app-background-color"
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
                        {t("app_background_reset_btn")}
                    </Button>
                )}
            </div>

            <div
                className="h-12 w-full rounded-lg border border-border"
                style={{ backgroundColor: selected }}
                aria-hidden
            />
        </div>
    );
}

export { DEFAULT_APP_BACKGROUND_COLOR };
