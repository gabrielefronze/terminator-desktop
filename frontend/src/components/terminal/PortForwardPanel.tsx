import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SshService } from "../../../bindings/terminator-desktop/backend/internal/services/ssh";
import type { PortForward } from "../../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { parseAppError } from "@/lib/error";
import {
    formatForwardRoute,
    normalizeForwardMode,
    type PortForwardMode,
} from "@/lib/portForward";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PortForwardPanelProps {
    sessionId: string;
    disabled?: boolean;
    layout?: "panel" | "page";
}

export function PortForwardPanel({
    sessionId,
    disabled,
    layout = "panel",
}: PortForwardPanelProps) {
    const { t } = useTranslation("terminal");
    const [forwards, setForwards] = useState<PortForward[]>([]);
    const [mode, setMode] = useState<PortForwardMode>("local");
    const [localHost, setLocalHost] = useState("127.0.0.1");
    const [localPort, setLocalPort] = useState("8080");
    const [remoteHost, setRemoteHost] = useState("127.0.0.1");
    const [remotePort, setRemotePort] = useState("80");

    const refresh = async () => {
        try {
            const list = await SshService.ListPortForwards(sessionId);
            setForwards(list ?? []);
        } catch {
            setForwards([]);
        }
    };

    useEffect(() => {
        void refresh();
    }, [sessionId]);

    const startForward = async () => {
        if (disabled) return;
        const id = crypto.randomUUID();
        const localHostValue = localHost.trim() || "127.0.0.1";
        const remoteHostValue = remoteHost.trim() || "127.0.0.1";
        try {
            if (mode === "remote") {
                await SshService.StartRemoteForward(
                    sessionId,
                    id,
                    localHostValue,
                    Number(localPort),
                    remoteHostValue,
                    Number(remotePort),
                );
            } else {
                await SshService.StartLocalForward(
                    sessionId,
                    id,
                    localHostValue,
                    Number(localPort),
                    remoteHostValue,
                    Number(remotePort),
                );
            }
            await refresh();
        } catch (error) {
            toast.error(parseAppError(error).message);
        }
    };

    const stopForward = async (id: string) => {
        try {
            await SshService.StopPortForward(id);
            await refresh();
        } catch (error) {
            toast.error(parseAppError(error).message);
        }
    };

    const isRemote = mode === "remote";

    return (
        <div
            className={cn(
                "flex h-full flex-col bg-card p-3",
                layout === "panel" && "border-l border-border",
                layout === "page" && "rounded-lg border border-border",
            )}
        >
            {layout === "panel" && (
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("port_forward_title")}
                </p>
            )}
            <div className="grid gap-2 text-sm">
                <div>
                    <Label>{t("port_forward_mode")}</Label>
                    <Select
                        value={mode}
                        onValueChange={(value) =>
                            setMode(value as PortForwardMode)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="local">
                                {t("port_forward_mode_local")}
                            </SelectItem>
                            <SelectItem value="remote">
                                {t("port_forward_mode_remote")}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                    {isRemote
                        ? t("port_forward_remote_hint")
                        : t("port_forward_local_hint")}
                </p>
                <div>
                    <Label>
                        {isRemote
                            ? t("port_forward_listen_remote")
                            : t("port_forward_listen_local")}
                    </Label>
                    <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                        <Input
                            value={remoteHost}
                            onChange={(e) => setRemoteHost(e.target.value)}
                            placeholder="127.0.0.1"
                        />
                        <Input
                            className="w-24"
                            value={remotePort}
                            onChange={(e) => setRemotePort(e.target.value)}
                            inputMode="numeric"
                        />
                    </div>
                </div>
                <div>
                    <Label>
                        {isRemote
                            ? t("port_forward_target_local")
                            : t("port_forward_target_remote")}
                    </Label>
                    <div className="mt-1 grid grid-cols-[1fr_auto] gap-2">
                        <Input
                            value={isRemote ? localHost : remoteHost}
                            onChange={(e) =>
                                isRemote
                                    ? setLocalHost(e.target.value)
                                    : setRemoteHost(e.target.value)
                            }
                            placeholder="127.0.0.1"
                        />
                        <Input
                            className="w-24"
                            value={isRemote ? localPort : remotePort}
                            onChange={(e) =>
                                isRemote
                                    ? setLocalPort(e.target.value)
                                    : setRemotePort(e.target.value)
                            }
                            inputMode="numeric"
                        />
                    </div>
                </div>
                <Button
                    type="button"
                    size="sm"
                    disabled={disabled}
                    onClick={() => void startForward()}
                >
                    {t("port_forward_add")}
                </Button>
            </div>
            <ul className="mt-4 space-y-2 overflow-y-auto text-xs">
                {forwards.map((fwd) => (
                    <li
                        key={fwd.id}
                        className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1"
                    >
                        <span className="min-w-0 font-mono">
                            <span className="mr-1.5 rounded bg-muted px-1 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {normalizeForwardMode(fwd.mode) === "remote"
                                    ? t("port_forward_mode_remote")
                                    : t("port_forward_mode_local")}
                            </span>
                            {formatForwardRoute(fwd)}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => void stopForward(fwd.id)}
                        >
                            {t("port_forward_stop")}
                        </Button>
                    </li>
                ))}
            </ul>
        </div>
    );
}
