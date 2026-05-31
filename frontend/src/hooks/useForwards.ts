import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ForwardService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedForward } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { handleAppError } from "@/lib/error";

export const FORWARDS_QUERY_KEY = ["forwards"];

export function useForwards() {
    return useQuery({
        queryKey: FORWARDS_QUERY_KEY,
        queryFn: () => ForwardService.GetAll(),
    });
}

export function useSaveForward() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (forward: SavedForward) => ForwardService.Save(forward),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: FORWARDS_QUERY_KEY }),
        onError: (error) => handleAppError(error),
    });
}

export function useDeleteForward() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => ForwardService.Delete(id),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: FORWARDS_QUERY_KEY }),
        onError: (error) => handleAppError(error),
    });
}
