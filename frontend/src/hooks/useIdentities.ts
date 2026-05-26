import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IdentityService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedIdentity } from "../../bindings/terminator-desktop/backend/internal/services/blob/";
import { handleAppError } from "@/lib/error";

export const IDENTITIES_QUERY_KEY = ["identities"];

export function useIdentities() {
    return useQuery({
        queryKey: IDENTITIES_QUERY_KEY,
        queryFn: async () => IdentityService.GetAll(),
    });
}

export function useSaveIdentity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (identity: SavedIdentity) => IdentityService.Save(identity),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IDENTITIES_QUERY_KEY });
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}

export function useDeleteIdentity() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => IdentityService.Delete(id),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: IDENTITIES_QUERY_KEY });
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}
