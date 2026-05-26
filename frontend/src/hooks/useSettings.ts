import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    AppSettings,
    SettingsService,
} from "../../bindings/terminator-desktop/backend/internal/services/settings";
import { handleAppError } from "@/lib/error";

export const SETTINGS_QUERY_KEY = ["settings"];
export const SYSTEM_FONTS_QUERY_KEY = ["systemFonts"];

const BROWSER_DEV_FONTS = [
    "Cascadia Code",
    "Consolas",
    "Courier New",
    "Fira Code",
    "JetBrains Mono",
    "Menlo",
    "Monaco",
    "SF Mono",
    "Source Code Pro",
    "Ubuntu Mono",
];

export function useSettings() {
    return useQuery({
        queryKey: SETTINGS_QUERY_KEY,
        queryFn: () => SettingsService.GetSettings(),
    });
}

export function useSystemFonts() {
    return useQuery({
        queryKey: SYSTEM_FONTS_QUERY_KEY,
        queryFn: async () => {
            try {
                const fonts = await SettingsService.ListSystemFonts();
                return fonts.length > 0 ? fonts : BROWSER_DEV_FONTS;
            } catch {
                return BROWSER_DEV_FONTS;
            }
        },
        staleTime: 60_000,
        refetchOnMount: true,
    });
}

export function useSaveSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: AppSettings) =>
            SettingsService.SaveSettings(settings),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY }),
        onError: (error) => {
            handleAppError(error);
        },
    });
}
