import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TabGroupService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { TabGroup } from "../../bindings/terminator-desktop/backend/internal/services/blob/";
import { handleAppError } from "@/lib/error";

export const TAB_GROUPS_QUERY_KEY = ["tabGroups"];

export function useTabGroups() {
    return useQuery({
        queryKey: TAB_GROUPS_QUERY_KEY,
        queryFn: async () => TabGroupService.GetAll(),
    });
}

export function useSaveTabGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (group: TabGroup) => TabGroupService.Save(group),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: TAB_GROUPS_QUERY_KEY,
            });
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}

export function useDeleteTabGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => TabGroupService.Delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: TAB_GROUPS_QUERY_KEY,
            });
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}
