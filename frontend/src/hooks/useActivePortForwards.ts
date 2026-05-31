import { useEffect, useState } from "react";
import { SshService } from "../../bindings/terminator-desktop/backend/internal/services/ssh";
import type { PortForward } from "../../bindings/terminator-desktop/backend/internal/services/ssh/models";

export function useActivePortForwards(sessionIds: string[]) {
    const [activeById, setActiveById] = useState<Map<string, PortForward>>(
        new Map(),
    );

    useEffect(() => {
        if (sessionIds.length === 0) {
            setActiveById(new Map());
            return;
        }

        let cancelled = false;

        const refresh = async () => {
            const next = new Map<string, PortForward>();
            for (const sessionId of sessionIds) {
                try {
                    const list = await SshService.ListPortForwards(sessionId);
                    for (const forward of list ?? []) {
                        next.set(forward.id, forward);
                    }
                } catch {
                    // Session may not be connected yet.
                }
            }
            if (!cancelled) {
                setActiveById(next);
            }
        };

        void refresh();
        const interval = setInterval(() => void refresh(), 2000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [sessionIds.join(",")]);

    return activeById;
}
