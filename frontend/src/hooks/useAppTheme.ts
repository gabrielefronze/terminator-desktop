import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { applyAppTheme } from "@/lib/appThemeApply";

export function useAppTheme() {
    const { data: settings } = useSettings();

    useEffect(() => {
        applyAppTheme(settings?.appBackgroundColor, settings?.accentColor);
    }, [settings?.appBackgroundColor, settings?.accentColor]);
}
