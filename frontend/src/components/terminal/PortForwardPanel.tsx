import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SshService } from "../../../bindings/terminator-desktop/backend/internal/services/ssh";
import type { PortForward } from "../../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { parseAppError } from "@/lib/error";
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
        try {
            await SshService.StartLocalForward(
                sessionId,
                id,
                "127.0.0.1",
                Number(localPort),
                remoteHost,
                Number(remotePort),
            );
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
                    <Label>{t("port_forward_local")}</Label>
                    <Input
                        value={localPort}
                        onChange={(e) => setLocalPort(e.target.value)}
                    />
                </div>
                <div>
                    <Label>{t("port_forward_remote_host")}</Label>
                    <Input
                        value={remoteHost}
                        onChange={(e) => setRemoteHost(e.target.value)}
                    />
                </div>
                <div>
                    <Label>{t("port_forward_remote_port")}</Label>
                    <Input
                        value={remotePort}
                        onChange={(e) => setRemotePort(e.target.value)}
                    />
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
                        <span className="font-mono">
                            {fwd.localHost}:{fwd.localPort} → {fwd.remoteHost}:
                            {fwd.remotePort}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
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
