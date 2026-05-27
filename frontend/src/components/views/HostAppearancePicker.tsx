import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    HOST_COLOR_OPTIONS,
    HOST_ICON_OPTIONS,
    HOST_ICONS,
    normalizeHostColor,
    normalizeHostIcon,
    type HostIconId,
} from "@/lib/hostAppearance";

interface HostAppearancePickerProps {
    icon: string | undefined;
    color: string | undefined;
    onIconChange: (icon: HostIconId) => void;
    onColorChange: (color: string) => void;
}

export function HostAppearancePicker({
    icon,
    color,
    onIconChange,
    onColorChange,
}: HostAppearancePickerProps) {
    const { t } = useTranslation("hosts");
    const selectedIcon = normalizeHostIcon(icon);
    const selectedColor = normalizeHostColor(color);

    return (
        <div className="grid gap-4">
            <div className="grid gap-2">
                <Label>{t("host_icon_label")}</Label>
                <div className="grid grid-cols-8 gap-1.5">
                    {HOST_ICON_OPTIONS.map(({ id, label }) => {
                        const Icon = HOST_ICONS[id];
                        const active = selectedIcon === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                title={label}
                                onClick={() => onIconChange(id)}
                                className={cn(
                                    "flex size-9 items-center justify-center rounded-md border transition-colors",
                                    active
                                        ? "border-primary bg-primary/15 text-primary"
                                        : "border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                                style={
                                    active
                                        ? {
                                              color: selectedColor,
                                              borderColor: selectedColor,
                                              backgroundColor: `color-mix(in srgb, ${selectedColor} 18%, transparent)`,
                                          }
                                        : undefined
                                }
                            >
                                <Icon className="size-4" />
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="grid gap-2">
                <Label>{t("host_color_label")}</Label>
                <div className="flex flex-wrap gap-2">
                    {HOST_COLOR_OPTIONS.map(({ value, label }) => {
                        const active = selectedColor === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                title={label}
                                onClick={() => onColorChange(value)}
                                className={cn(
                                    "size-8 rounded-full border-2 transition-transform",
                                    active
                                        ? "scale-110 border-foreground"
                                        : "border-transparent hover:scale-105",
                                )}
                                style={{ backgroundColor: value }}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
