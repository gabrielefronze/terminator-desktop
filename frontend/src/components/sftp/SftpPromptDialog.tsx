import { useEffect, useState } from "react";
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

export type SftpPromptMode = "mkdir" | "rename" | "chmod";

interface SftpPromptDialogProps {
    mode: SftpPromptMode | null;
    initialValue?: string;
    onClose: () => void;
    onSubmit: (value: string) => void;
}

export function SftpPromptDialog({
    mode,
    initialValue = "",
    onClose,
    onSubmit,
}: SftpPromptDialogProps) {
    const { t } = useTranslation(["sftp", "common"]);
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (mode) {
            setValue(initialValue);
        }
    }, [initialValue, mode]);

    if (!mode) {
        return null;
    }

    const titleKey =
        mode === "mkdir"
            ? "mkdir_title"
            : mode === "rename"
              ? "rename_title"
              : "chmod_title";

    const labelKey =
        mode === "mkdir"
            ? "mkdir_label"
            : mode === "rename"
              ? "rename_label"
              : "chmod_label";

    const placeholderKey =
        mode === "chmod" ? "chmod_placeholder" : "name_placeholder";

    const handleSubmit = () => {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        onSubmit(trimmed);
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t(titleKey)}</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-2">
                    <Label htmlFor="sftp-prompt-input">{t(labelKey)}</Label>
                    <Input
                        id="sftp-prompt-input"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={t(placeholderKey)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        autoFocus
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        {t("cancel", { ns: "common" })}
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!value.trim()}
                    >
                        {t("save", { ns: "common" })}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
