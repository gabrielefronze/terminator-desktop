import { useState, useEffect, SyntheticEvent, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
    HostGroup,
    ItemType,
} from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { flattenGroupsForSelect } from "@/lib/hostTree";

interface HostGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (group: HostGroup) => void;
    initialData?: HostGroup | null;
    allGroups: HostGroup[];
    isSaving: boolean;
}

const DEFAULT_GROUP: Partial<HostGroup> = {
    name: "",
    parentId: undefined,
};

export function HostGroupModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    allGroups,
    isSaving,
}: HostGroupModalProps) {
    const { t } = useTranslation(["hosts", "common"]);
    const [formData, setFormData] = useState<Partial<HostGroup>>(DEFAULT_GROUP);

    const parentOptions = useMemo(
        () => flattenGroupsForSelect(allGroups, initialData?.id),
        [allGroups, initialData?.id],
    );

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || DEFAULT_GROUP);
        }
    }, [isOpen, initialData]);

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        const parentId =
            formData.parentId === "none" || !formData.parentId
                ? undefined
                : formData.parentId;

        const finalGroup = new HostGroup({
            ...formData,
            id: formData.id || "",
            type: ItemType.TypeGroup,
            parentId,
        });

        onSave(finalGroup);
    };

    const isEditing = !!initialData;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? t("edit_group_title") : t("new_group_title")}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="group-name">{t("group_name")}</Label>
                        <Input
                            id="group-name"
                            required
                            placeholder={t("group_name_placeholder")}
                            value={formData.name || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label>{t("parent_group")}</Label>
                        <Select
                            value={formData.parentId || "none"}
                            onValueChange={(val) =>
                                setFormData({
                                    ...formData,
                                    parentId: val === "none" ? undefined : val,
                                })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder={t("parent_group_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t("no_parent_group")}</SelectItem>
                                {parentOptions.map(({ group, depth }) => (
                                    <SelectItem key={group.id} value={group.id}>
                                        {"\u00A0".repeat(depth * 2)}
                                        {group.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                : t("save_group")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
