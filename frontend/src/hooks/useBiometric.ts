import { useCallback, useEffect, useState } from "react";
import { AuthService } from "../../bindings/terminator-desktop/backend/internal/services/auth";

export function useBiometric() {
    const [available, setAvailable] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [ready, setReady] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const [isAvailable, isEnabled] = await Promise.all([
                AuthService.BiometricAvailable(),
                AuthService.BiometricEnabled(),
            ]);
            setAvailable(isAvailable);
            setEnabled(isEnabled);
        } catch {
            setAvailable(false);
            setEnabled(false);
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { available, enabled, ready, refresh };
}
