import { useEffect, useState } from "react";
import { KeyService } from "../../bindings/terminator-desktop/backend/internal/services/blob";

export function useDerivedPublicKey(
    privateKey: string,
    initialPublicKey?: string,
): string {
    const [publicKey, setPublicKey] = useState(initialPublicKey ?? "");

    useEffect(() => {
        setPublicKey(initialPublicKey ?? "");
    }, [initialPublicKey]);

    useEffect(() => {
        const trimmed = privateKey.trim();
        if (!trimmed) {
            setPublicKey("");
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(() => {
            void KeyService.DerivePublicKey(trimmed)
                .then((derived) => {
                    if (!cancelled) {
                        setPublicKey(derived);
                    }
                })
                .catch(() => {
                    if (!cancelled) {
                        setPublicKey("");
                    }
                });
        }, 300);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [privateKey]);

    return publicKey;
}
