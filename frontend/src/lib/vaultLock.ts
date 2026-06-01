import { AuthService } from "../../bindings/terminator-desktop/backend/internal/services/auth";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";
import { getTitleBarSessions } from "@/lib/sessionTabs";
import { buildSessionRestoreSnapshot } from "@/lib/sessionRestore";
import { Service as SessionRestoreService } from "../../bindings/terminator-desktop/backend/internal/services/sessionrestore";
import { SettingsService } from "../../bindings/terminator-desktop/backend/internal/services/settings";

async function persistSessionSnapshotBeforeLock(): Promise<void> {
    try {
        const settings = await SettingsService.GetSettings();
        if (settings.sessionRestoreEnabled === false) {
            return;
        }

        const { sessions, activeSessionId } = useSessionStore.getState();
        const leaders = getTitleBarSessions(sessions);
        if (leaders.length === 0) {
            await SessionRestoreService.ClearSnapshot();
            return;
        }

        await SessionRestoreService.SaveSnapshot(
            buildSessionRestoreSnapshot(sessions, activeSessionId),
        );
    } catch (error) {
        console.error("session restore save before lock failed", error);
    }
}

/** Lock the vault and return the UI to the lock screen. */
export async function lockVaultFromUI(): Promise<void> {
    await persistSessionSnapshotBeforeLock();
    useSessionStore.getState().clearSessions();
    await AuthService.LockVault();
    useAuthStore.getState().setUnlocked(false);
}
