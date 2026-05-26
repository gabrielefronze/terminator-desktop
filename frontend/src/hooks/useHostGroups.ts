import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GroupService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { HostGroup } from "../../bindings/terminator-desktop/backend/internal/services/blob/";
import { handleAppError } from "@/lib/error";
import { HOSTS_QUERY_KEY } from "@/hooks/useHosts";

export const GROUPS_QUERY_KEY = ["hostGroups"];

export function useHostGroups() {
    return useQuery({
        queryKey: GROUPS_QUERY_KEY,
        queryFn: async () => GroupService.GetAll(),
    });
}

export function useSaveHostGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (group: HostGroup) => GroupService.Save(group),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}

export function useDeleteHostGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => GroupService.Delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
            void queryClient.invalidateQueries({ queryKey: HOSTS_QUERY_KEY });
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}
