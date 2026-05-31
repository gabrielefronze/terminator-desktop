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
    const [localHost, setLocalHost] = useState("127.0.0.1");
    const [localPort, setLocalPort] = useState("8080");
    const [remoteHost, setRemoteHost] = useState("127.0.0.1");
    const [remotePort, setRemotePort] = useState("80");

    const remoteHosts = useMemo(
        () => hosts.filter((host) => !isBuiltinLocalhostHost(host)),
        [hosts],
    );

    useEffect(() => {
        setName(initialData?.name ?? "");
        setHostId(initialData?.hostId ?? remoteHosts[0]?.id ?? "");
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
                localHost: localHost.trim() || "127.0.0.1",
                localPort: Number(localPort),
                remoteHost: remoteHost.trim() || "127.0.0.1",
                remotePort: Number(remotePort),
            }),
        );
    };

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
                            <Label htmlFor="forward-local-host">
                                {t("local_host_label")}
                            </Label>
                            <Input
                                id="forward-local-host"
                                value={localHost}
                                onChange={(e) => setLocalHost(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-local-port">
                                {t("port_forward_local", { ns: "terminal" })}
                            </Label>
                            <Input
                                id="forward-local-port"
                                type="number"
                                min={1}
                                max={65535}
                                value={localPort}
                                onChange={(e) => setLocalPort(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-remote-host">
                                {t("port_forward_remote_host", { ns: "terminal" })}
                            </Label>
                            <Input
                                id="forward-remote-host"
                                value={remoteHost}
                                onChange={(e) => setRemoteHost(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="forward-remote-port">
                                {t("port_forward_remote_port", { ns: "terminal" })}
                            </Label>
                            <Input
                                id="forward-remote-port"
                                type="number"
                                min={1}
                                max={65535}
                                value={remotePort}
                                onChange={(e) => setRemotePort(e.target.value)}
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
