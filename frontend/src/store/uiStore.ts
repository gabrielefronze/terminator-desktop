import { create } from "zustand";

export enum ViewType {
    Hosts = "hosts",
    TabGroups = "tabGroups",
    Keys = "keys",
    Identities = "identities",
    Snippets = "snippets",
    Forwards = "forwards",
    Sftp = "sftp",
    Containers = "containers",
    Settings = "settings",
    Terminal = "terminal",
}

interface UIState {
    activeView: ViewType;
    isSidebarVisible: boolean;
    updateVersionReady: string | null;
    isNewTabHostPickerOpen: boolean;
    isCommandPaletteOpen: boolean;
    isShortcutsOverlayOpen: boolean;
    commandBroadcastEnabled: boolean;
    setActiveView: (view: ViewType) => void;
    toggleSidebar: () => void;
    setUpdateVersionReady: (version: string | null) => void;
    openNewTabHostPicker: () => void;
    closeNewTabHostPicker: () => void;
    openCommandPalette: () => void;
    closeCommandPalette: () => void;
    toggleCommandPalette: () => void;
    openShortcutsOverlay: () => void;
    closeShortcutsOverlay: () => void;
    toggleShortcutsOverlay: () => void;
    toggleCommandBroadcast: () => void;
    setCommandBroadcastEnabled: (enabled: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeView: ViewType.Hosts,
    isSidebarVisible: true,
    updateVersionReady: null,
    isNewTabHostPickerOpen: false,
    isCommandPaletteOpen: false,
    isShortcutsOverlayOpen: false,
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
    openShortcutsOverlay: () => set({ isShortcutsOverlayOpen: true }),
    closeShortcutsOverlay: () => set({ isShortcutsOverlayOpen: false }),
    toggleShortcutsOverlay: () =>
        set((state) => ({
            isShortcutsOverlayOpen: !state.isShortcutsOverlayOpen,
        })),
    toggleCommandBroadcast: () =>
        set((state) => ({
            commandBroadcastEnabled: !state.commandBroadcastEnabled,
        })),
    setCommandBroadcastEnabled: (enabled) =>
        set({ commandBroadcastEnabled: enabled }),
}));