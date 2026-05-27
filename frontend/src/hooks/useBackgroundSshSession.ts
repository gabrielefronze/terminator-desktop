import { useEffect, useRef, useState } from "react";
import { SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
import { SSHConnectionConfig } from "../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { parseAppError } from "@/lib/error";

export function useBackgroundSshSession(config: SSHConnectionConfig | null) {
    const [ready, setReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const configRef = useRef(config);

    useEffect(() => {
        configRef.current = config;
    }, [config]);

    useEffect(() => {
        if (!config) {
            setReady(false);
            setError(null);
            return;
        }

        let cancelled = false;
        setReady(false);
        setError(null);

        void SshService.Connect(config)
            .then(() => {
                if (!cancelled) setReady(true);
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(parseAppError(err).message);
                }
            });

        return () => {
            cancelled = true;
            void SshService.Disconnect(config.id).catch(() => {});
            setReady(false);
        };
    }, [config?.id, config?.host, config?.port, config?.username]);

    return { ready, error };
}
