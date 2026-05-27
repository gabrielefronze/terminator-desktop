import { useEffect, useMemo } from "react";
import { useHosts, useBuiltinLocalhost } from "@/hooks/useHosts";
import { useSessionStore } from "@/store/sessionStore";
import { BUILTIN_LOCALHOST_HOST_ID } from "@/lib/defaultLocalhost";

/** Keeps open tab icon/color/title in sync when hosts are edited on the main page. */
export function useSyncSessionHostAppearance() {
    const { data: hosts } = useHosts();
    const { data: builtin } = useBuiltinLocalhost();
    const syncSessionsFromHosts = useSessionStore((s) => s.syncSessionsFromHosts);

    const allHosts = useMemo(() => {
        const list = [...(hosts ?? [])];
        if (builtin && !list.some((host) => host.id === BUILTIN_LOCALHOST_HOST_ID)) {
            list.push(builtin);
        }
        return list;
    }, [hosts, builtin]);

    useEffect(() => {
        if (allHosts.length === 0) return;
        syncSessionsFromHosts(allHosts);
    }, [allHosts, syncSessionsFromHosts]);
}
