import { useState, useEffect, SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import {
    SavedIdentity,
    ItemType,
} from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IdentityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (identity: SavedIdentity) => void;
    initialData?: SavedIdentity | null;
    isSaving: boolean;
}

export function IdentityModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    isSaving,
}: IdentityModalProps) {
    const { t } = useTranslation(["identities", "common"]);
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    useEffect(() => {
        if (isOpen) {
            setName(initialData?.name || "");
            setUsername(initialData?.username || "");
            setPassword(initialData?.password || "");
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        onSave(
            new SavedIdentity({
                id: initialData?.id || "",
                type: ItemType.TypeIdentity,
                name,
                username,
                password,
            }),
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {initialData ? t("edit_title") : t("new_title")}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="identity-name">{t("identity_name_label")}</Label>
                        <Input
                            id="identity-name"
                            placeholder={t("identity_name_placeholder")}
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="identity-username">
                            {t("username", { ns: "common" })}
                        </Label>
                        <Input
                            id="identity-username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="identity-password">
                            {t("password", { ns: "common" })}
                        </Label>
                        <Input
                            id="identity-password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            {t("cancel", { ns: "common" })}
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving
                                ? t("saving", { ns: "common" })
                                : t("save_identity")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
