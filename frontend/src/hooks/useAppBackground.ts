import { useEffect } from "react";
import { useSettings } from "@/hooks/useSettings";
import { applyAppBackgroundColor } from "@/lib/appTheme";

export function useAppBackground() {
    const { data: settings } = useSettings();

    useEffect(() => {
        applyAppBackgroundColor(settings?.appBackgroundColor);
    }, [settings?.appBackgroundColor]);
}
