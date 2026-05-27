import { useState } from "react";
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

interface PassphrasePromptModalProps {
    open: boolean;
    onSubmit: (passphrase: string) => void;
    onCancel: () => void;
}

export function PassphrasePromptModal({
    open,
    onSubmit,
    onCancel,
}: PassphrasePromptModalProps) {
    const { t } = useTranslation("terminal");
    const [passphrase, setPassphrase] = useState("");

    return (
        <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("key_passphrase_title")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                    <Label htmlFor="key-passphrase">{t("key_passphrase_label")}</Label>
                    <Input
                        id="key-passphrase"
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && passphrase) {
                                onSubmit(passphrase);
                            }
                        }}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>
                        {t("host_key_cancel")}
                    </Button>
                    <Button
                        disabled={!passphrase}
                        onClick={() => onSubmit(passphrase)}
                    >
                        {t("key_passphrase_submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
