import { create } from "zustand";

export enum ViewType {
    Hosts = "hosts",
    Keys = "keys",
    Identities = "identities",
    Snippets = "snippets",
    Sftp = "sftp",
    Settings = "settings",
    Terminal = "terminal",
}

interface UIState {
    activeView: ViewType;
    isSidebarVisible: boolean;
    updateVersionReady: string | null;
    isNewTabHostPickerOpen: boolean;
    setActiveView: (view: ViewType) => void;
    toggleSidebar: () => void;
    setUpdateVersionReady: (version: string | null) => void;
    openNewTabHostPicker: () => void;
    closeNewTabHostPicker: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeView: ViewType.Hosts,
    isSidebarVisible: true,
    updateVersionReady: null,
    isNewTabHostPickerOpen: false,
    setActiveView: (view) => set({activeView: view}),
    toggleSidebar: () => set((state) => ({isSidebarVisible: !state.isSidebarVisible})),
    setUpdateVersionReady: (version) => set({ updateVersionReady: version }),
    openNewTabHostPicker: () => set({ isNewTabHostPickerOpen: true }),
    closeNewTabHostPicker: () => set({ isNewTabHostPickerOpen: false }),
}));