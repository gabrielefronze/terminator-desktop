import type { QueryClient } from "@tanstack/react-query";
import { AppSettings, SettingsService } from "../../bindings/terminator-desktop/backend/internal/services/settings";
import { SETTINGS_QUERY_KEY } from "@/hooks/useSettings";
import {
    clampTerminalFontSize,
    resolveTerminalFontSize,
} from "@/lib/terminalTheme";
import { useSessionStore } from "@/store/sessionStore";

function effectiveTerminalFontSize(
    settings: AppSettings,
    sessionFontSize?: number,
): number {
    if (sessionFontSize && sessionFontSize > 0) {
        return clampTerminalFontSize(sessionFontSize);
    }
    return resolveTerminalFontSize(settings);
}

export async function adjustTerminalFontSize(
    delta: number,
    queryClient: QueryClient,
): Promise<void> {
    let settings = queryClient.getQueryData<AppSettings>(SETTINGS_QUERY_KEY);
    if (!settings) {
        settings = await SettingsService.GetSettings();
    }

    const { sessions, activeSessionId } = useSessionStore.getState();
    const activeSession = sessions.find(
        (session) => session.id === activeSessionId,
    );
    const current = effectiveTerminalFontSize(
        settings,
        activeSession?.terminalFontSize,
    );
    const next = clampTerminalFontSize(current + delta);
    if (next === current) {
        return;
    }

    const updated = new AppSettings({
        ...settings,
        terminalFontSize: next,
    });
    await SettingsService.SaveSettings(updated);
    queryClient.setQueryData(SETTINGS_QUERY_KEY, updated);
    useSessionStore.getState().setAllSessionsTerminalFontSize(next);
}
