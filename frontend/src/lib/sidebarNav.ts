import { cn } from "@/lib/utils";

export function sidebarNavButtonClass(isActive: boolean): string {
    return cn(
        "wails-no-drag",
        isActive
            ? "bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-primary",
    );
}
