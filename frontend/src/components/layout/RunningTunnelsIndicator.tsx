import { useMemo, useState } from "react";
import { ArrowLeftRight, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useActivePortForwards } from "@/hooks/useActivePortForwards";
import { useForwards } from "@/hooks/useForwards";
import { parseAppError } from "@/lib/error";
import {
    formatPortForwardRoute,
    stopSavedForward,
} from "@/lib/savedForwardRuntime";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/store/sessionStore";
import type { PortForward } from "../../../bindings/terminator-desktop/backend/internal/services/ssh/models";

const titleBarActionButtonClass =
    "wails-no-drag relative flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground";

type RunningTunnel = PortForward & {
    sessionTitle: string;
    savedName?: string;
};

export function RunningTunnelsIndicator() {
    const { t } = useTranslation(["terminal", "forwards"]);
    const sessions = useSessionStore((state) => state.sessions);
    const { data: savedForwards } = useForwards();
    const [open, setOpen] = useState(false);

    const remoteSessionIds = useMemo(
        () =>
            sessions
                .filter((session) => !session.config.local)
                .map((session) => session.id),
        [sessions],
    );
    const activeForwards = useActivePortForwards(remoteSessionIds);

    const savedForwardNames = useMemo(() => {
        const names = new Map<string, string>();
        for (const forward of savedForwards ?? []) {
            names.set(forward.id, forward.name);
        }
        return names;
    }, [savedForwards]);

    const runningTunnels = useMemo(() => {
        const items: RunningTunnel[] = [];
        for (const forward of activeForwards.values()) {
            const session = sessions.find(
                (item) => item.id === forward.sessionId,
            );
            items.push({
                ...forward,
                sessionTitle: session?.title ?? t("missing_host", { ns: "forwards" }),
                savedName: savedForwardNames.get(forward.id),
            });
        }
        return items.sort((a, b) =>
            formatPortForwardRoute(a).localeCompare(formatPortForwardRoute(b)),
        );
    }, [activeForwards, savedForwardNames, sessions, t]);

    if (runningTunnels.length === 0) {
        return null;
    }

    const stopTunnel = async (forwardId: string) => {
        try {
            await stopSavedForward(forwardId);
        } catch (error) {
            toast.error(parseAppError(error).message);
        }
    };

    return (
        <div className="flex shrink-0 items-center px-1">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button"
                        title={t(
                            runningTunnels.length === 1
                                ? "running_tunnels_title_one"
                                : "running_tunnels_title",
                            { count: runningTunnels.length },
                        )}
                        aria-label={t(
                            runningTunnels.length === 1
                                ? "running_tunnels_title_one"
                                : "running_tunnels_title",
                            { count: runningTunnels.length },
                        )}
                        className={cn(
                            titleBarActionButtonClass,
                            "border-success/40 bg-success/10 text-success hover:bg-success/15 hover:text-success",
                        )}
                    >
                        <ArrowLeftRight className="size-3.5" />
                        <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex size-2.5 items-center justify-center">
                            <span className="tunnel-status-ping absolute inline-flex size-full rounded-full bg-success" />
                            <span className="relative inline-flex size-1.5 rounded-full bg-success" />
                        </span>
                        {runningTunnels.length > 1 && (
                            <span className="absolute -bottom-1 -right-1 flex min-w-3.5 items-center justify-center rounded-full bg-success px-0.5 text-[9px] font-semibold leading-none text-success-foreground">
                                {runningTunnels.length}
                            </span>
                        )}
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    side="bottom"
                    className="w-80 gap-0 p-0"
                >
                    <div className="border-b border-border px-3 py-2">
                        <p className="text-sm font-medium">
                            {t(
                                runningTunnels.length === 1
                                    ? "running_tunnels_title_one"
                                    : "running_tunnels_title",
                                { count: runningTunnels.length },
                            )}
                        </p>
                    </div>
                    <ul className="max-h-72 overflow-y-auto p-1">
                        {runningTunnels.map((tunnel) => (
                            <li
                                key={tunnel.id}
                                className="flex items-start gap-2 rounded-md px-2 py-2 hover:bg-muted/60"
                            >
                                <div className="mt-1.5 flex size-2 shrink-0 items-center justify-center">
                                    <span className="tunnel-status-ping inline-flex size-2 rounded-full bg-success" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                        {tunnel.savedName ??
                                            formatPortForwardRoute(tunnel)}
                                    </p>
                                    <p className="truncate font-mono text-xs text-muted-foreground">
                                        {formatPortForwardRoute(tunnel)}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {tunnel.sessionTitle}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    title={t("stop_forward", { ns: "forwards" })}
                                    aria-label={t("stop_forward", {
                                        ns: "forwards",
                                    })}
                                    className="wails-no-drag mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    onClick={() => void stopTunnel(tunnel.id)}
                                >
                                    <Square className="size-3" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </PopoverContent>
            </Popover>
        </div>
    );
}
