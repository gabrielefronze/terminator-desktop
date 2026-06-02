import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import {
    Host,
    ItemType,
    SavedForward,
} from "../../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { isBuiltinLocalhostHost } from "@/lib/defaultLocalhost";
import {
    normalizeForwardMode,
    type PortForwardMode,
} from "@/lib/portForward";

interface ForwardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (forward: SavedForward) => void;
    initialData?: SavedForward | null;
    hosts: Host[];
    isSaving?: boolean;
}

export function ForwardModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    hosts,
    isSaving,
}: ForwardModalProps) {
    const { t } = useTranslation(["forwards", "terminal", "common"]);
    const [name, setName] = useState("");
    const [hostId, setHostId] = useState("");
    const [mode, setMode] = useState<PortForwardMode>("local");
    const [localHost, setLocalHost] = useState("127.0.0.1");
    const [localPort, setLocalPort] = useState("8080");
    const [remoteHost, setRemoteHost] = useState("127.0.0.1");
    const [remotePort, setRemotePort] = useState("80");

    const remoteHosts = useMemo(
        () => hosts.filter((host) => !isBuiltinLocalhostHost(host)),
        [hosts],
    );

    const isRemote = mode === "remote";

    useEffect(() => {
        setName(initialData?.name ?? "");
        setHostId(initialData?.hostId ?? remoteHosts[0]?.id ?? "");
        setMode(normalizeForwardMode(initialData?.mode));
        setLocalHost(initialData?.localHost || "127.0.0.1");
        setLocalPort(String(initialData?.localPort ?? 8080));
        setRemoteHost(initialData?.remoteHost || "127.0.0.1");
        setRemotePort(String(initialData?.remotePort ?? 80));
    }, [initialData, isOpen, remoteHosts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(
            new SavedForward({
                id: initialData?.id ?? "",
                type: ItemType.TypeForward,
                name: name.trim(),
                hostId,
                mode,
                localHost: localHost.trim() || "127.0.0.1",
                localPort: Number(localPort),
                remoteHost: remoteHost.trim() || "127.0.0.1",
                remotePort: Number(remotePort),
            }),
        );
    };

    const listenHostLabel = isRemote
        ? t("port_forward_listen_remote", { ns: "terminal" })
        : t("local_host_label");
    const listenPortLabel = isRemote
        ? t("port_forward_remote_port", { ns: "terminal" })
        : t("port_forward_local", { ns: "terminal" });
    const targetHostLabel = isRemote
        ? t("local_host_label")
        : t("port_forward_remote_host", { ns: "terminal" });
    const targetPortLabel = isRemote
        ? t("port_forward_local", { ns: "terminal" })
        : t("port_forward_remote_port", { ns: "terminal" });

    const listenHost = isRemote ? remoteHost : localHost;
    const setListenHost = isRemote ? setRemoteHost : setLocalHost;
    const listenPort = isRemote ? remotePort : localPort;
    const setListenPort = isRemote ? setRemotePort : setLocalPort;
    const targetHost = isRemote ? localHost : remoteHost;
    const setTargetHost = isRemote ? setLocalHost : setRemoteHost;
    const targetPort = isRemote ? localPort : remotePort;
    const setTargetPort = isRemote ? setLocalPort : setRemotePort;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            {initialData?.id
                                ? t("edit_forward")
                                : t("create_forward")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="forward-name">{t("name_label")}</Label>
                            <Input
                                id="forward-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-host">{t("host_label")}</Label>
                            <Select
                                value={hostId}
                                onValueChange={setHostId}
                                disabled={remoteHosts.length === 0}
                            >
                                <SelectTrigger id="forward-host">
                                    <SelectValue placeholder={t("host_placeholder")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {remoteHosts.map((host) => (
                                        <SelectItem key={host.id} value={host.id}>
                                            <span className="flex items-center gap-2">
                                                <HostIconBadge
                                                    icon={host.icon}
                                                    color={host.color}
                                                    size="sm"
                                                />
                                                {host.name || host.host}
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-mode">{t("mode_label")}</Label>
                            <Select
                                value={mode}
                                onValueChange={(value) =>
                                    setMode(value as PortForwardMode)
                                }
                            >
                                <SelectTrigger id="forward-mode">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="local">
                                        {t("port_forward_mode_local", {
                                            ns: "terminal",
                                        })}
                                    </SelectItem>
                                    <SelectItem value="remote">
                                        {t("port_forward_mode_remote", {
                                            ns: "terminal",
                                        })}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {isRemote
                                    ? t("port_forward_remote_hint", {
                                          ns: "terminal",
                                      })
                                    : t("port_forward_local_hint", {
                                          ns: "terminal",
                                      })}
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-listen-host">
                                {listenHostLabel}
                            </Label>
                            <Input
                                id="forward-listen-host"
                                value={listenHost}
                                onChange={(e) => setListenHost(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-listen-port">
                                {listenPortLabel}
                            </Label>
                            <Input
                                id="forward-listen-port"
                                type="number"
                                min={1}
                                max={65535}
                                value={listenPort}
                                onChange={(e) => setListenPort(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-target-host">
                                {targetHostLabel}
                            </Label>
                            <Input
                                id="forward-target-host"
                                value={targetHost}
                                onChange={(e) => setTargetHost(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-target-port">
                                {targetPortLabel}
                            </Label>
                            <Input
                                id="forward-target-port"
                                type="number"
                                min={1}
                                max={65535}
                                value={targetPort}
                                onChange={(e) => setTargetPort(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t("cancel", { ns: "common" })}
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSaving || !hostId || remoteHosts.length === 0}
                        >
                            {t("save", { ns: "common" })}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
