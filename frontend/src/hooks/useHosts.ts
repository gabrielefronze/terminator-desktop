import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { HostService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob/";
import { handleAppError } from "@/lib/error";

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
        mutationFn: async (id: string) => HostService.Delete(id),
        onSuccess: () => queryClient.invalidateQueries({queryKey: HOSTS_QUERY_KEY}),
        onError: (error) => {
            handleAppError(error);
        },
    });
}