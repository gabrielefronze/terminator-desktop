import type { AppSettings } from "../../bindings/terminator-desktop/backend/internal/services/settings";

export function isSshReconnectPromptEnabled(
    settings: AppSettings | undefined,
): boolean {
    return settings?.sshReconnectPromptEnabled !== false;
}
