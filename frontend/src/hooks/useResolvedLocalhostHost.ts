import { useMemo } from "react";
import { useHosts, useBuiltinLocalhost } from "@/hooks/useHosts";
import { useLocalhostHostSetting } from "@/hooks/useLocalhostHostSetting";
import {
    BUILTIN_LOCALHOST_HOST_ID,
    resolveLocalhostHost,
} from "@/lib/defaultLocalhost";

export function useResolvedLocalhostHost() {
    const { enabled } = useLocalhostHostSetting();
    const { data: hosts } = useHosts();
    const { data: builtin } = useBuiltinLocalhost();

    const host = useMemo(
        () =>
            enabled ? resolveLocalhostHost(hosts, builtin) : null,
        [enabled, hosts, builtin],
    );

    return { host, enabled };
}

export function useHostsWithoutBuiltin() {
    const query = useHosts();

    const data = useMemo(
        () =>
            query.data?.filter((h) => h.id !== BUILTIN_LOCALHOST_HOST_ID),
        [query.data],
    );

    return { ...query, data };
}
