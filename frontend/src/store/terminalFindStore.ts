import { create } from "zustand";

interface TerminalFindState {
    isOpen: boolean;
    query: string;
    open: () => void;
    close: () => void;
    toggle: () => void;
    setQuery: (query: string) => void;
}

export const useTerminalFindStore = create<TerminalFindState>((set, get) => ({
    isOpen: false,
    query: "",
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false, query: "" }),
    toggle: () => {
        if (get().isOpen) {
            get().close();
        } else {
            get().open();
        }
    },
    setQuery: (query) => set({ query }),
}));
