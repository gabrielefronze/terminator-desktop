import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/hooks/useSettings";
import {
    searchCommandHistory,
    type CommandHistoryScope,
} from "@/lib/commandHistory";

export const COMMAND_HISTORY_SEARCH_KEY = "commandHistorySearch";

export function useCommandHistorySearch(
    query: string,
    scope: CommandHistoryScope,
    hostId: string,
    enabled: boolean,
) {
    const { data: settings } = useSettings();

    return useQuery({
        queryKey: [COMMAND_HISTORY_SEARCH_KEY, query, scope, hostId],
        queryFn: () => searchCommandHistory(query, scope, hostId, 50),
        enabled: enabled && settings?.commandHistoryEnabled !== false,
        staleTime: 5_000,
    });
}
