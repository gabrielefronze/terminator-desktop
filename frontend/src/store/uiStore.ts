import { create } from "zustand";

export enum ViewType {
    Hosts = "hosts",
    TabGroups = "tabGroups",
    Keys = "keys",
    Identities = "identities",
    Snippets = "snippets",
    Forwards = "forwards",
    Sftp = "sftp",
    Settings = "settings",
    Terminal = "terminal",
}

interface UIState {
    activeView: ViewType;
    isSidebarVisible: boolean;
    updateVersionReady: string | null;
    isNewTabHostPickerOpen: boolean;
    isCommandPaletteOpen: boolean;
    commandBroadcastEnabled: boolean;
    setActiveView: (view: ViewType) => void;
    toggleSidebar: () => void;
    setUpdateVersionReady: (version: string | null) => void;
    openNewTabHostPicker: () => void;
    closeNewTabHostPicker: () => void;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    toggleCommandPalette: () => void;
    toggleCommandBroadcast: () => void;
    setCommandBroadcastEnabled: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeView: ViewType.Hosts,
    isSidebarVisible: true,
    updateVersionReady: null,
    isNewTabHostPickerOpen: false,
    isCommandPaletteOpen: false,
    commandBroadcastEnabled: false,
    setActiveView: (view) => set({activeView: view}),
    toggleSidebar: () => set((state) => ({isSidebarVisible: !state.isSidebarVisible})),
    setUpdateVersionReady: (version) => set({ updateVersionReady: version }),
    openNewTabHostPicker: () => set({ isNewTabHostPickerOpen: true }),
    closeNewTabHostPicker: () => set({ isNewTabHostPickerOpen: false }),
    openCommandPalette: () => set({ isCommandPaletteOpen: true }),
    closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
    toggleCommandPalette: () =>
        set((state) => ({ isCommandPaletteOpen: !state.isCommandPaletteOpen })),
    toggleCommandBroadcast: () =>
        set((state) => ({
            commandBroadcastEnabled: !state.commandBroadcastEnabled,
        })),
    setCommandBroadcastEnabled: (enabled) =>
        set({ commandBroadcastEnabled: enabled }),
}));