import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { HostKeyCheck } from "../../../bindings/terminator-desktop/backend/internal/services/knownhosts/models";

interface HostKeyTrustModalProps {
    check: HostKeyCheck | null;
    onTrust: () => void;
    onCancel: () => void;
}

export function HostKeyTrustModal({
    check,
    onTrust,
    onCancel,
}: HostKeyTrustModalProps) {
    const { t } = useTranslation("terminal");

    if (!check) return null;

    const isChanged = check.status === "changed";

    return (
        <Dialog open onOpenChange={(open) => !open && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {isChanged
                            ? t("host_key_changed_title")
                            : t("host_key_unknown_title")}
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {isChanged
                        ? t("host_key_changed_body", {
                              host: check.host,
                              port: check.port,
                          })
                        : t("host_key_unknown_body", {
                              host: check.host,
                              port: check.port,
                          })}
                </p>
                <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">
                    <div>{check.keyType}</div>
                    <div>{check.fingerprint}</div>
                    {isChanged && check.storedFingerprint && (
                        <div className="mt-2 text-destructive">
                            {t("host_key_was")}: {check.storedFingerprint}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        {t("host_key_cancel")}
                    </Button>
                    <Button onClick={onTrust}>
                        {isChanged ? t("host_key_trust_anyway") : t("host_key_trust")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
