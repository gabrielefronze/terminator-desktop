import { AuthService } from "../../bindings/terminator-desktop/backend/internal/services/auth";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";

/** Lock the vault and return the UI to the lock screen. */
export async function lockVaultFromUI(): Promise<void> {
    useSessionStore.getState().clearSessions();
    await AuthService.LockVault();
    useAuthStore.getState().setUnlocked(false);
}
