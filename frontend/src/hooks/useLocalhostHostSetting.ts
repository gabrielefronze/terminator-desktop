import {
    AppSettings,
    SettingsService,
} from "../../bindings/terminator-desktop/backend/internal/services/settings";
import { HostService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import {
    BUILTIN_LOCALHOST_HOST_ID,
    isLocalhostHostEnabled,
} from "@/lib/defaultLocalhost";
import { useSettings, useSaveSettings } from "@/hooks/useSettings";
import { HOSTS_QUERY_KEY } from "@/hooks/useHosts";
import { useQueryClient } from "@tanstack/react-query";
import { handleAppError } from "@/lib/error";

export function useLocalhostHostSetting() {
    const { data: settings } = useSettings();
    const saveSettingsMutation = useSaveSettings();
    const queryClient = useQueryClient();

    const enabled = isLocalhostHostEnabled(settings?.showLocalhostHost);

    const setEnabled = async (showLocalhostHost: boolean) => {
        try {
            const current =
                settings ?? (await SettingsService.GetSettings());
            await saveSettingsMutation.mutateAsync(
                new AppSettings({ ...current, showLocalhostHost }),
            );

            if (!showLocalhostHost) {
                const hosts = await HostService.GetAll();
                const saved = hosts.find(
                    (h) => h.id === BUILTIN_LOCALHOST_HOST_ID,
                );
                if (saved) {
                    await HostService.Delete(BUILTIN_LOCALHOST_HOST_ID);
                    await queryClient.invalidateQueries({
                        queryKey: HOSTS_QUERY_KEY,
                    });
                }
            }
        } catch (error) {
            handleAppError(error);
            throw error;
        }
    };

    return {
        enabled,
        setEnabled,
        isPending: saveSettingsMutation.isPending,
    };
}
