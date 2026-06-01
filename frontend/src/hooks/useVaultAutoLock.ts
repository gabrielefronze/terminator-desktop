import { useCallback, useEffect, useRef } from "react";
import { Events } from "@wailsio/runtime";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useSettings } from "@/hooks/useSettings";
import { lockVaultFromUI } from "@/lib/vaultLock";
import { AppEvent } from "@/lib/events";

const CHECK_INTERVAL_MS = 15_000;
const ACTIVITY_THROTTLE_MS = 1_000;

export function useVaultAutoLock() {
    const { t } = useTranslation("settings");
    const isUnlocked = useAuthStore((s) => s.isUnlocked);
    const { data: settings } = useSettings();
    const lastActivityRef = useRef(Date.now());
    const lockingRef = useRef(false);

    const lock = useCallback(async (showToast: boolean) => {
        if (lockingRef.current || !useAuthStore.getState().isUnlocked) {
            return;
        }
        lockingRef.current = true;
        try {
            await lockVaultFromUI();
            if (showToast) {
                toast.info(t("vault_auto_locked_toast"));
            }
        } finally {
            lockingRef.current = false;
        }
    }, [t]);

    const resetActivity = useCallback(() => {
        lastActivityRef.current = Date.now();
    }, []);

    useEffect(() => {
        if (!isUnlocked) {
            return;
        }
        resetActivity();
    }, [isUnlocked, resetActivity]);

    useEffect(() => {
        if (!isUnlocked || !settings?.vaultAutoLockEnabled) {
            return;
        }

        let throttleTimer: ReturnType<typeof setTimeout> | null = null;
        const onActivity = () => {
            if (throttleTimer) {
                return;
            }
            throttleTimer = setTimeout(() => {
                throttleTimer = null;
            }, ACTIVITY_THROTTLE_MS);
            resetActivity();
        };

        const eventNames: (keyof WindowEventMap)[] = [
            "mousedown",
            "keydown",
            "touchstart",
            "wheel",
            "scroll",
        ];
        for (const name of eventNames) {
            window.addEventListener(name, onActivity, {
                capture: true,
                passive: true,
            });
        }

        return () => {
            if (throttleTimer) {
                clearTimeout(throttleTimer);
            }
            for (const name of eventNames) {
                window.removeEventListener(name, onActivity, { capture: true });
            }
        };
    }, [isUnlocked, settings?.vaultAutoLockEnabled, resetActivity]);

    useEffect(() => {
        if (!isUnlocked || !settings?.vaultAutoLockEnabled) {
            return;
        }

        const minutes = settings.vaultAutoLockMinutes || 15;
        const timeoutMs = minutes * 60 * 1000;

        const intervalId = window.setInterval(() => {
            if (Date.now() - lastActivityRef.current >= timeoutMs) {
                void lock(true);
            }
        }, CHECK_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [
        isUnlocked,
        lock,
        settings?.vaultAutoLockEnabled,
        settings?.vaultAutoLockMinutes,
    ]);

    useEffect(() => {
        if (!isUnlocked || !settings?.vaultAutoLockOnSleep) {
            return;
        }

        const onVisibility = () => {
            if (document.hidden) {
                void lock(true);
            }
        };
        document.addEventListener("visibilitychange", onVisibility);
        return () =>
            document.removeEventListener("visibilitychange", onVisibility);
    }, [isUnlocked, lock, settings?.vaultAutoLockOnSleep]);

    useEffect(() => {
        if (!isUnlocked) {
            return;
        }

        const unsubscribe = Events.On(AppEvent.VaultAutoLocked, () => {
            void lock(true);
        });
        return unsubscribe;
    }, [isUnlocked, lock]);
}
