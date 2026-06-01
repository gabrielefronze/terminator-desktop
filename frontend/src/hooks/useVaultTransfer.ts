import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Service as VaultTransferService } from "../../bindings/terminator-desktop/backend/internal/services/vaulttransfer";
import { handleAppError } from "@/lib/error";
import { HOSTS_QUERY_KEY } from "@/hooks/useHosts";
import { KEYS_QUERY_KEY } from "@/hooks/useKeys";
import { IDENTITIES_QUERY_KEY } from "@/hooks/useIdentities";
import { SNIPPETS_QUERY_KEY } from "@/hooks/useSnippets";
import { FORWARDS_QUERY_KEY } from "@/hooks/useForwards";
import { GROUPS_QUERY_KEY } from "@/hooks/useHostGroups";
import { TAB_GROUPS_QUERY_KEY } from "@/hooks/useTabGroups";

function invalidateVaultQueries(queryClient: ReturnType<typeof useQueryClient>) {
    void queryClient.invalidateQueries({ queryKey: HOSTS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: KEYS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: IDENTITIES_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: SNIPPETS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: FORWARDS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: TAB_GROUPS_QUERY_KEY });
}

export function useExportVault() {
    return useMutation({
        mutationFn: async ({
            encrypted,
            password,
        }: {
            encrypted: boolean;
            password: string;
        }) => VaultTransferService.ExportVault(encrypted, password),
        onError: (error) => {
            handleAppError(error);
        },
    });
}

export function useImportVault() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (password: string) =>
            VaultTransferService.ImportVault(password),
        onSuccess: (result) => {
            if (!result.cancelled) {
                invalidateVaultQueries(queryClient);
            }
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}

export function useImportSSHConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            configPath,
            mergeKnownHosts,
        }: {
            configPath: string;
            mergeKnownHosts: boolean;
        }) =>
            VaultTransferService.ImportSSHConfig(configPath, mergeKnownHosts),
        onSuccess: (result) => {
            if (!result.cancelled) {
                invalidateVaultQueries(queryClient);
            }
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}

export function useImportSSHConfigWithDialog() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (mergeKnownHosts: boolean) =>
            VaultTransferService.ImportSSHConfigWithDialog(mergeKnownHosts),
        onSuccess: (result) => {
            if (!result.cancelled) {
                invalidateVaultQueries(queryClient);
            }
        },
        onError: (error) => {
            handleAppError(error);
        },
    });
}
