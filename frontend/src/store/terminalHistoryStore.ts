import { create } from "zustand";
import type { CommandHistoryScope } from "@/lib/commandHistory";

interface TerminalHistoryState {
    isOpen: boolean;
    query: string;
    scope: CommandHistoryScope;
    open: (scope?: CommandHistoryScope) => void;
    close: () => void;
    setQuery: (query: string) => void;
    setScope: (scope: CommandHistoryScope) => void;
    toggleScope: () => void;
}

export const useTerminalHistoryStore = create<TerminalHistoryState>((set) => ({
    isOpen: false,
    query: "",
    scope: "local",
    open: (scope) =>
        set({
            isOpen: true,
            query: "",
            scope: scope ?? "local",
        }),
    close: () => set({ isOpen: false, query: "" }),
    setQuery: (query) => set({ query }),
    setScope: (scope) => set({ scope }),
    toggleScope: () =>
        set((state) => ({
            scope: state.scope === "local" ? "global" : "local",
        })),
}));
