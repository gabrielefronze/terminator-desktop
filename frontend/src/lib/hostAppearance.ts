import {
    Server,
    Database,
    Cloud,
    Terminal,
    HardDrive,
    Globe,
    Box,
    Cpu,
    Network,
    Shield,
    Lock,
    Container,
    GitBranch,
    Layers,
    Monitor,
    Router,
    Folder,
    type LucideIcon,
} from "lucide-react";

export const DEFAULT_HOST_ICON = "server";
export const DEFAULT_HOST_COLOR = "#3b82f6";
export const DEFAULT_GROUP_ICON = "folder";
export const DEFAULT_GROUP_COLOR = "#a855f7";

export const HOST_ICONS = {
    server: Server,
    database: Database,
    cloud: Cloud,
    terminal: Terminal,
    hardDrive: HardDrive,
    globe: Globe,
    box: Box,
    cpu: Cpu,
    network: Network,
    shield: Shield,
    lock: Lock,
    container: Container,
    gitBranch: GitBranch,
    layers: Layers,
    monitor: Monitor,
    router: Router,
    folder: Folder,
} as const;

export type HostIconId = keyof typeof HOST_ICONS;

export const HOST_ICON_OPTIONS: { id: HostIconId; label: string }[] = [
    { id: "server", label: "Server" },
    { id: "database", label: "Database" },
    { id: "cloud", label: "Cloud" },
    { id: "terminal", label: "Terminal" },
    { id: "hardDrive", label: "Storage" },
    { id: "globe", label: "Globe" },
    { id: "box", label: "Box" },
    { id: "cpu", label: "CPU" },
    { id: "network", label: "Network" },
    { id: "shield", label: "Shield" },
    { id: "lock", label: "Lock" },
    { id: "container", label: "Container" },
    { id: "gitBranch", label: "Git" },
    { id: "layers", label: "Layers" },
    { id: "monitor", label: "Monitor" },
    { id: "router", label: "Router" },
    { id: "folder", label: "Folder" },
];

export const HOST_COLOR_OPTIONS: { value: string; label: string }[] = [
    { value: "#3b82f6", label: "Blue" },
    { value: "#22c55e", label: "Green" },
    { value: "#a855f7", label: "Purple" },
    { value: "#f97316", label: "Orange" },
    { value: "#ef4444", label: "Red" },
    { value: "#eab308", label: "Yellow" },
    { value: "#06b6d4", label: "Cyan" },
    { value: "#ec4899", label: "Pink" },
    { value: "#64748b", label: "Slate" },
    { value: "#fafafa", label: "White" },
];

const iconIds = new Set<string>(Object.keys(HOST_ICONS));
const colorValues = new Set(HOST_COLOR_OPTIONS.map((c) => c.value));

export function normalizeHostIcon(icon?: string | null): HostIconId {
    if (icon && iconIds.has(icon)) {
        return icon as HostIconId;
    }
    return DEFAULT_HOST_ICON;
}

export function normalizeHostColor(color?: string | null): string {
    if (color && colorValues.has(color)) {
        return color;
    }
    return DEFAULT_HOST_COLOR;
}

export function normalizeGroupIcon(icon?: string | null): HostIconId {
    if (icon && iconIds.has(icon)) {
        return icon as HostIconId;
    }
    return DEFAULT_GROUP_ICON;
}

export function normalizeGroupColor(color?: string | null): string {
    if (color && colorValues.has(color)) {
        return color;
    }
    return DEFAULT_GROUP_COLOR;
}

export function groupCardBorderColor(color?: string | null): string {
    const resolved = normalizeGroupColor(color);
    return `color-mix(in srgb, ${resolved} 55%, var(--color-border, #27272a))`;
}

export function resolveHostIcon(icon?: string | null): LucideIcon {
    return HOST_ICONS[normalizeHostIcon(icon)];
}

export function hostIconBadgeStyle(color?: string | null): {
    backgroundColor: string;
    color: string;
} {
    const resolved = normalizeHostColor(color);
    return {
        backgroundColor: `color-mix(in srgb, ${resolved} 18%, transparent)`,
        color: resolved,
    };
}
