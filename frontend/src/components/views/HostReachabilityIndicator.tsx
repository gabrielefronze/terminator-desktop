import { useTranslation } from "react-i18next";
import { HostPingResult } from "../../../bindings/terminator-desktop/backend/internal/services/reachability";
import { cn } from "@/lib/utils";

interface HostReachabilityIndicatorProps {
    result?: HostPingResult;
    isChecking?: boolean;
    className?: string;
}

export function HostReachabilityIndicator({
    result,
    isChecking = false,
    className,
}: HostReachabilityIndicatorProps) {
    const { t } = useTranslation("hosts");

    let title = t("reachability_unknown");
    let dotClass = "bg-muted-foreground/40";

    if (result?.reachable) {
        if (result.latencyMs <= 0) {
            title = t("reachability_local");
            dotClass = "bg-success";
        } else {
            title = t("reachability_online", { ms: result.latencyMs });
            dotClass = "bg-success";
        }
    } else if (result) {
        title = t("reachability_offline");
        dotClass = "bg-destructive";
    } else if (isChecking) {
        title = t("reachability_checking");
        dotClass = "bg-muted-foreground/60 animate-pulse";
    }

    return (
        <span
            role="status"
            title={title}
            aria-label={title}
            className={cn(
                "inline-block size-2 shrink-0 rounded-full ring-2 ring-host-card",
                dotClass,
                className,
            )}
        />
    );
}
