import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { HostService, TabGroupService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob/";
import { handleAppError } from "@/lib/error";
import { TAB_GROUPS_QUERY_KEY } from "@/hooks/useTabGroups";
import { BUILTIN_LOCALHOST_HOST_ID } from "@/lib/defaultLocalhost";

export const HOSTS_QUERY_KEY = ["hosts"];
export const BUILTIN_LOCALHOST_QUERY_KEY = ["builtinLocalhost"];

export function useHosts() {
    return useQuery({
        queryKey: HOSTS_QUERY_KEY,
        queryFn: async () => HostService.GetAll(),
    });
}

export function useBuiltinLocalhost() {
    return useQuery({
        queryKey: BUILTIN_LOCALHOST_QUERY_KEY,
        queryFn: async () => HostService.BuiltinLocalhost(),
        staleTime: Number.POSITIVE_INFINITY,
    });
}

/** Vault hosts plus the built-in localhost template when it is not stored separately. */
export function useAllHosts(): Host[] {
    const { data: hosts } = useHosts();
    const { data: builtin } = useBuiltinLocalhost();

    return useMemo(() => {
        const list = [...(hosts ?? [])];
        if (builtin && !list.some((host) => host.id === BUILTIN_LOCALHOST_HOST_ID)) {
            list.push(builtin);
        }
        return list;
    }, [hosts, builtin]);
}

export function useSaveHost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (host: Host) => HostService.Save(host),
        onSuccess: () => queryClient.invalidateQueries({queryKey: HOSTS_QUERY_KEY}),
        onError: (error) => {
            handleAppError(error);
        },
    });
}

export function useDeleteHost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await TabGroupService.RemoveHostFromAllGroups(id);
            return HostService.Delete(id);
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: HOSTS_QUERY_KEY });
            void queryClient.invalidateQueries({
                queryKey: TAB_GROUPS_QUERY_KEY,
            });
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}