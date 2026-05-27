import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import {
    HostPingResult,
    HostPingTarget,
    ReachabilityService,
} from "../../bindings/terminator-desktop/backend/internal/services/reachability";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";

export const HOST_REACHABILITY_QUERY_KEY = "hostReachability";

const REFETCH_INTERVAL_MS = 20_000;

function buildTargets(hosts: Host[]): HostPingTarget[] {
    return hosts.map(
        (host) =>
            new HostPingTarget({
                id: host.id,
                host: host.host,
                port: host.port,
                local: isBuiltinLocalhostHost(host),
            }),
    );
}

export function useHostReachability(hosts: Host[] | undefined) {
    const hostKey = hosts?.map((h) => `${h.id}:${h.host}:${h.port}`).join("|") ?? "";

    const query = useQuery({
        queryKey: [HOST_REACHABILITY_QUERY_KEY, hostKey],
        queryFn: async () => {
            if (!hosts?.length) return [] as HostPingResult[];
            return ReachabilityService.PingHosts(buildTargets(hosts));
        },
        enabled: (hosts?.length ?? 0) > 0,
        refetchInterval: REFETCH_INTERVAL_MS,
        staleTime: 10_000,
    });

    const byId = useMemo(() => {
        const map = new Map<string, HostPingResult>();
        for (const result of query.data ?? []) {
            map.set(result.id, result);
        }
        return map;
    }, [query.data]);

    return {
        byId,
        isChecking: query.isFetching,
    };
}
