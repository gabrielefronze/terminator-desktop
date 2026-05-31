import { useEffect, useMemo, useState, SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import {
    Host,
    ItemType,
    TabGroup,
} from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HostAppearancePicker } from "@/components/views/HostAppearancePicker";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import {
    DEFAULT_GROUP_COLOR,
    DEFAULT_GROUP_ICON,
    normalizeGroupColor,
    normalizeGroupIcon,
    type HostIconId,
} from "@/lib/hostAppearance";
import { resolveTabGroupHosts } from "@/lib/tabGroups";

interface TabGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (group: TabGroup) => void;
    initialData?: Partial<TabGroup> | null;
    hostIds: string[];
    allHosts: Host[];
    isSaving: boolean;
}

const DEFAULT_TAB_GROUP: Partial<TabGroup> = {
    name: "",
    hostIds: [],
    icon: DEFAULT_GROUP_ICON,
    color: DEFAULT_GROUP_COLOR,
};

export function TabGroupModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    hostIds,
    allHosts,
    isSaving,
}: TabGroupModalProps) {
    const { t } = useTranslation(["tabgroups", "common"]);
    const [formData, setFormData] = useState<Partial<TabGroup>>(DEFAULT_TAB_GROUP);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData ?? DEFAULT_TAB_GROUP);
        }
    }, [isOpen, initialData]);

    const resolvedHosts = useMemo(() => {
        if (!hostIds.length) return [];
        return resolveTabGroupHosts(
            new TabGroup({
                id: formData.id ?? "",
                type: ItemType.TypeTabGroup,
                name: formData.name ?? "",
                hostIds,
            }),
            allHosts,
        );
    }, [allHosts, formData.id, formData.name, hostIds]);

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        const finalGroup = new TabGroup({
            ...formData,
            id: formData.id || "",
            type: ItemType.TypeTabGroup,
            name: formData.name?.trim() || "",
            hostIds,
            icon: normalizeGroupIcon(formData.icon),
            color: normalizeGroupColor(formData.color),
        });

        onSave(finalGroup);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {formData.id
                            ? t("edit_title")
                            : t("save_title")}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tab-group-name">{t("name_label")}</Label>
                        <Input
                            id="tab-group-name"
                            value={formData.name ?? ""}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    name: e.target.value,
                                }))
                            }
                            placeholder={t("name_placeholder")}
                            required
                            autoFocus
                        />
                    </div>

                    <HostAppearancePicker
                        icon={formData.icon}
                        color={formData.color}
                        onIconChange={(icon: HostIconId) =>
                            setFormData((prev) => ({ ...prev, icon }))
                        }
                        onColorChange={(color) =>
                            setFormData((prev) => ({ ...prev, color }))
                        }
                    />

                    {resolvedHosts.length > 0 && (
                        <div className="grid gap-2">
                            <Label>{t("hosts_label")}</Label>
                            <ul className="grid gap-1 rounded-md border border-border p-2">
                                {resolvedHosts.map((host, index) => (
                                    <li
                                        key={`${host.id}-${index}`}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <HostIconBadge
                                            icon={host.icon}
                                            color={host.color}
                                            size="sm"
                                        />
                                        <span className="truncate">
                                            {host.name || host.host}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            {t("common:cancel")}
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {t("common:save")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
