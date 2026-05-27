import { useState, useEffect, SyntheticEvent, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Host, ItemType } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
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
import { useKeys } from "@/hooks/useKeys";
import { useIdentities } from "@/hooks/useIdentities";
import { HostGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob/";
import { flattenGroupsForSelect } from "@/lib/hostTree";
import { HostAppearancePicker } from "@/components/views/HostAppearancePicker";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import {
    DEFAULT_HOST_COLOR,
    DEFAULT_HOST_ICON,
    normalizeHostColor,
    normalizeHostIcon,
    type HostIconId,
} from "@/lib/hostAppearance";

type AuthMode = "password" | "identity" | "key";

interface HostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (host: Host) => void;
    initialData?: Host | null;
    groups: HostGroup[];
    isSaving: boolean;
    /** Local sidebar shell: only label and appearance, no SSH fields. */
    localShellOnly?: boolean;
}

const DEFAULT_HOST: Partial<Host> = {
    name: "",
    host: "",
    port: 22,
    username: "root",
    password: "",
    keyId: undefined,
    identityId: undefined,
    userpassIdentityIds: [],
    icon: DEFAULT_HOST_ICON,
    color: DEFAULT_HOST_COLOR,
};

function deriveAuthMode(host: Partial<Host> | null | undefined): AuthMode {
    if (host?.keyId) return "key";
    if (host?.identityId) return "identity";
    return "password";
}

export function HostModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    groups,
    isSaving,
    localShellOnly = false,
}: HostModalProps) {
    const { t } = useTranslation(["hosts", "common"]);
    const [formData, setFormData] = useState<Partial<Host>>(DEFAULT_HOST);
    const [authMode, setAuthMode] = useState<AuthMode>("password");
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();
    const userpassIdentities = useMemo(
        () => (identities ?? []).filter((identity) => Boolean(identity.password)),
        [identities],
    );

    const groupOptions = useMemo(
        () => flattenGroupsForSelect(groups),
        [groups],
    );

    useEffect(() => {
        if (isOpen) {
            const data = initialData || DEFAULT_HOST;
            setFormData(data);
            setAuthMode(deriveAuthMode(data));
        }
    }, [isOpen, initialData]);

    const handleAuthModeChange = (mode: AuthMode) => {
        setAuthMode(mode);
        if (mode === "password") {
            setFormData((prev) => ({
                ...prev,
                keyId: undefined,
                identityId: undefined,
            }));
        } else if (mode === "identity") {
            setFormData((prev) => ({
                ...prev,
                keyId: undefined,
                password: "",
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                identityId: undefined,
                password: "",
            }));
        }
    };

    const handleIdentityChange = (identityId: string) => {
        if (identityId === "none") {
            setFormData((prev) => ({ ...prev, identityId: undefined }));
            return;
        }
        const identity = identities?.find((i) => i.id === identityId);
        setFormData((prev) => ({
            ...prev,
            identityId,
            username: identity?.username ?? prev.username,
            password: "",
            keyId: undefined,
        }));
    };

    const toggleAutoIdentity = (identityId: string) => {
        setFormData((prev) => {
            const current = prev.userpassIdentityIds ?? [];
            const exists = current.includes(identityId);
            return {
                ...prev,
                userpassIdentityIds: exists
                    ? current.filter((id) => id !== identityId)
                    : [...current, identityId],
            };
        });
    };

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();

        let keyId = formData.keyId;
        let identityId = formData.identityId;
        let password = formData.password;

        if (authMode === "key") {
            identityId = undefined;
            password = "";
            keyId = formData.keyId === "none" ? undefined : formData.keyId;
        } else if (authMode === "identity") {
            keyId = undefined;
            password = "";
            identityId =
                formData.identityId === "none" ? undefined : formData.identityId;
        } else {
            keyId = undefined;
            identityId = undefined;
        }

        const finalHost = new Host({
            ...formData,
            id: formData.id || "",
            type: ItemType.TypeHost,
            host: localShellOnly ? "" : formData.host || "",
            port: localShellOnly ? 0 : Number(formData.port) || 22,
            username: localShellOnly ? "" : formData.username || "",
            keyId: localShellOnly ? undefined : keyId,
            identityId: localShellOnly ? undefined : identityId,
            userpassIdentityIds: localShellOnly
                ? []
                : (formData.userpassIdentityIds ?? []),
            password: localShellOnly ? undefined : password || undefined,
            groupId:
                formData.groupId === "none" || !formData.groupId
                    ? undefined
                    : formData.groupId,
            icon: normalizeHostIcon(formData.icon),
            color: normalizeHostColor(formData.color),
        });

        onSave(finalHost);
    };

    const isEditing = !!initialData;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? t("edit_title") : t("new_title")}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="flex items-start gap-4">
                        <HostIconBadge
                            icon={formData.icon}
                            color={formData.color}
                            className="size-12"
                            iconClassName="size-6"
                        />
                        <div className="min-w-0 flex-1">
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
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="name">
                            {t("label_optional", { ns: "common" })}
                        </Label>
                        <Input
                            id="name"
                            placeholder={t("label_placeholder")}
                            value={formData.name || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    {!localShellOnly && (
                    <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3 grid gap-2">
                            <Label htmlFor="host">
                                {t("host_ip", { ns: "common" })}
                            </Label>
                            <Input
                                id="host"
                                placeholder={t("host_placeholder")}
                                required
                                value={formData.host || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, host: e.target.value })}
                            />
                        </div>
                        <div className="col-span-1 grid gap-2">
                            <Label htmlFor="port">
                                {t("port", { ns: "common" })}
                            </Label>
                            <Input
                                id="port"
                                type="number"
                                required
                                value={formData.port || 22}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        port: parseInt(e.target.value),
                                    })}
                            />
                        </div>
                    </div>
                    )}

                    {!localShellOnly && (
                    <>
                    <div className="grid gap-2">
                        <Label>{t("auth_method_label")}</Label>
                        <Select
                            value={authMode}
                            onValueChange={(val) =>
                                handleAuthModeChange(val as AuthMode)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="password">
                                    {t("auth_mode_password")}
                                </SelectItem>
                                <SelectItem value="identity">
                                    {t("auth_mode_identity")}
                                </SelectItem>
                                <SelectItem value="key">
                                    {t("auth_mode_key")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {authMode === "password" && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="username">
                                    {t("username", { ns: "common" })}
                                </Label>
                                <Input
                                    id="username"
                                    required
                                    value={formData.username || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    {t("password_optional")}
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={t("password_placeholder")}
                                    value={formData.password || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            password: e.target.value,
                                        })}
                                />
                            </div>
                        </>
                    )}

                    {authMode === "identity" && (
                        <div className="grid gap-2">
                            <Label>{t("identity_label")}</Label>
                            <Select
                                value={formData.identityId || "none"}
                                onValueChange={handleIdentityChange}
                            >
                                <SelectTrigger>
                                    <SelectValue
                                        placeholder={t("select_identity_placeholder")}
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        {t("select_identity_placeholder")}
                                    </SelectItem>
                                    {identities?.map((identity) => (
                                        <SelectItem
                                            key={identity.id}
                                            value={identity.id}
                                        >
                                            {identity.name} ({identity.username})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {t("identity_username_hint")}
                            </p>
                        </div>
                    )}

                    {authMode === "key" && (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="username-key">
                                    {t("username", { ns: "common" })}
                                </Label>
                                <Input
                                    id="username-key"
                                    required
                                    value={formData.username || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{t("ssh_key_label")}</Label>
                                <Select
                                    value={formData.keyId || "none"}
                                    onValueChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            keyId:
                                                val === "none" ? undefined : val,
                                        })}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t("select_key_placeholder")}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            {t("select_key_placeholder")}
                                        </SelectItem>
                                        {keys?.map((key) => (
                                            <SelectItem key={key.id} value={key.id}>
                                                {key.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    <div className="grid gap-2">
                        <Label>{t("auto_password_identities_label")}</Label>
                        <p className="text-xs text-muted-foreground">
                            {t("auto_password_identities_hint")}
                        </p>
                        <div className="flex flex-wrap gap-2 rounded-lg border border-border p-2">
                            {userpassIdentities.length === 0 && (
                                <span className="text-xs text-muted-foreground">
                                    {t("auto_password_identities_empty")}
                                </span>
                            )}
                            {userpassIdentities.map((identity) => {
                                const selected = (formData.userpassIdentityIds ?? []).includes(identity.id);
                                return (
                                    <Button
                                        key={identity.id}
                                        type="button"
                                        size="sm"
                                        variant={selected ? "default" : "outline"}
                                        onClick={() => toggleAutoIdentity(identity.id)}
                                    >
                                        {identity.name}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>{t("host_group_label")}</Label>
                        <Select
                            value={formData.groupId || "none"}
                            onValueChange={(val) =>
                                setFormData({
                                    ...formData,
                                    groupId: val === "none" ? undefined : val,
                                })}
                        >
                            <SelectTrigger>
                                <SelectValue
                                    placeholder={t("select_group_placeholder")}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    {t("uncategorized")}
                                </SelectItem>
                                {groupOptions.map(({ group, depth }) => (
                                    <SelectItem key={group.id} value={group.id}>
                                        {"\u00A0".repeat(depth * 2)}
                                        {group.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    </>
                    )}

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
                                : t("save_host")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
