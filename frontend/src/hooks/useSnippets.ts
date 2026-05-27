import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SnippetService } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { SavedSnippet } from "../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { handleAppError } from "@/lib/error";

export const SNIPPETS_QUERY_KEY = ["snippets"];

export function useSnippets() {
    return useQuery({
        queryKey: SNIPPETS_QUERY_KEY,
        queryFn: () => SnippetService.GetAll(),
    });
}

export function useSaveSnippet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (snippet: SavedSnippet) => SnippetService.Save(snippet),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY }),
        onError: (error) => handleAppError(error),
    });
}

export function useDeleteSnippet() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => SnippetService.Delete(id),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY }),
        onError: (error) => handleAppError(error),
    });
}
