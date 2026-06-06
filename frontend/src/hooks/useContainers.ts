import { useQuery } from "@tanstack/react-query";
import {
    RunningContainer,
    Service as ContainerService,
} from "../../bindings/terminator-desktop/backend/internal/services/containers";

export const CONTAINERS_QUERY_KEY = "containers";
export const CONTAINER_RUNTIME_QUERY_KEY = "containerRuntime";

const REFETCH_INTERVAL_MS = 5_000;

export function useContainerRuntime() {
    return useQuery({
        queryKey: [CONTAINER_RUNTIME_QUERY_KEY],
        queryFn: () => ContainerService.DetectRuntime(),
        staleTime: 60_000,
        retry: false,
    });
}

export function useContainers(runtime: string) {
    return useQuery({
        queryKey: [CONTAINERS_QUERY_KEY, runtime],
        queryFn: async () => ContainerService.ListRunning(runtime),
        refetchInterval: REFETCH_INTERVAL_MS,
        staleTime: 2_000,
    });
}

export function filterContainers(
    containers: RunningContainer[] | undefined,
    query: string,
): RunningContainer[] {
    if (!containers?.length) {
        return [];
    }
    const q = query.trim().toLowerCase();
    if (!q) {
        return containers;
    }
    return containers.filter(
        (container) =>
            container.name.toLowerCase().includes(q) ||
            container.image.toLowerCase().includes(q) ||
            container.id.toLowerCase().includes(q),
    );
}
