import type { AppSettings } from "../../bindings/terminator-desktop/backend/internal/services/settings";

export function sshKeepAliveConnectionFields(settings: AppSettings | undefined) {
    return {
        keepAliveEnabled: settings?.sshKeepAliveEnabled !== false,
        keepAliveIntervalSeconds:
            settings?.sshKeepAliveIntervalSeconds &&
            settings.sshKeepAliveIntervalSeconds > 0
                ? settings.sshKeepAliveIntervalSeconds
                : 30,
    };
}
