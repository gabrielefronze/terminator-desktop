import { useState, useEffect, SyntheticEvent, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Host, ItemType } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
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
import { BUILTIN_LOCALHOST_HOST_ID } from "@/lib/defaultLocalhost";
import { validateRelayHostId } from "@/lib/relayHost";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type AuthMode = "password" | "identity" | "key";

interface HostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (host: Host) => void;
    initialData?: Host | null;
    allHosts?: Host[];
    groups: HostGroup[];
    isSaving: boolean;
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

function HostFormSection({
    title,
    description,
    children,
    className,
}: {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn("grid gap-2.5", className)}>
            <div className="space-y-0.5">
                <h3 className="text-sm font-medium leading-none">{title}</h3>
                {description ? (
                    <p className="text-xs text-muted-foreground">{description}</p>
                ) : null}
            </div>
            <div className="grid gap-3 rounded-lg border border-border/70 bg-muted/15 p-3">
                {children}
            </div>
        </section>
    );
}

function FieldGroup({
    label,
    hint,
    children,
    className,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("grid gap-1.5", className)}>
            <Label>{label}</Label>
            {children}
            {hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}

export function HostModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    allHosts = [],
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

    const relayHostOptions = useMemo(
        () =>
            allHosts.filter(
                (candidate) =>
                    candidate.id !== formData.id &&
                    candidate.id !== BUILTIN_LOCALHOST_HOST_ID,
            ),
        [allHosts, formData.id],
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

        const relayHostId =
            !localShellOnly &&
            formData.relayHostId &&
            formData.relayHostId !== "none"
                ? formData.relayHostId
                : undefined;

        const relayError = validateRelayHostId(
            formData.id,
            relayHostId,
            allHosts,
        );
        if (relayError) {
            toast.error(t(`relay_error_${relayError}`));
            return;
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
            relayHostId: localShellOnly ? undefined : relayHostId,
            icon: normalizeHostIcon(formData.icon),
            color: normalizeHostColor(formData.color),
        });

        onSave(finalHost);
    };

    const isEditing = !!initialData;

    const authFields = (
        <div className="grid gap-3">
            <FieldGroup label={t("auth_method_label")}>
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
            </FieldGroup>

            {authMode === "password" && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <FieldGroup label={t("username", { ns: "common" })}>
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
                    </FieldGroup>
                    <FieldGroup label={t("password_optional")}>
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
                    </FieldGroup>
                </div>
            )}

            {authMode === "identity" && (
                <FieldGroup
                    label={t("identity_label")}
                    hint={t("identity_username_hint")}
                >
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
                </FieldGroup>
            )}

            {authMode === "key" && (
                <div className="grid gap-3 sm:grid-cols-2">
                    <FieldGroup label={t("username", { ns: "common" })}>
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
                    </FieldGroup>
                    <FieldGroup label={t("ssh_key_label")}>
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
                    </FieldGroup>
                </div>
            )}
        </div>
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="flex max-h-[min(90vh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
                <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
                    <DialogTitle>
                        {isEditing ? t("edit_title") : t("new_title")}
                    </DialogTitle>
                </DialogHeader>

                <form
                    onSubmit={handleSubmit}
                    className="flex min-h-0 flex-1 flex-col"
                >
                    <div className="grid flex-1 gap-5 overflow-y-auto px-5 py-4">
                        <HostFormSection
                            title={t("form_section_general")}
                            description={t("form_section_general_desc")}
                        >
                            <FieldGroup
                                label={t("label_optional", { ns: "common" })}
                            >
                                <Input
                                    id="name"
                                    placeholder={t("label_placeholder")}
                                    value={formData.name || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })}
                                />
                            </FieldGroup>

                            <div className="flex items-start gap-3">
                                <HostIconBadge
                                    icon={formData.icon}
                                    color={formData.color}
                                    className="size-11 shrink-0"
                                    iconClassName="size-5"
                                />
                                <div className="min-w-0 flex-1">
                                    <HostAppearancePicker
                                        icon={formData.icon}
                                        color={formData.color}
                                        onIconChange={(icon: HostIconId) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                icon,
                                            }))
                                        }
                                        onColorChange={(color) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                color,
                                            }))
                                        }
                                    />
                                </div>
                            </div>
                        </HostFormSection>

                        {!localShellOnly && (
                            <>
                                <HostFormSection
                                    title={t("form_section_connection")}
                                    description={t(
                                        "form_section_connection_desc",
                                    )}
                                >
                                    <div className="grid grid-cols-4 gap-3">
                                        <FieldGroup
                                            label={t("host_ip", {
                                                ns: "common",
                                            })}
                                            className="col-span-3"
                                        >
                                            <Input
                                                id="host"
                                                placeholder={t(
                                                    "host_placeholder",
                                                )}
                                                required
                                                value={formData.host || ""}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        host: e.target.value,
                                                    })}
                                            />
                                        </FieldGroup>
                                        <FieldGroup
                                            label={t("port", { ns: "common" })}
                                            className="col-span-1"
                                        >
                                            <Input
                                                id="port"
                                                type="number"
                                                required
                                                value={formData.port || 22}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        port: parseInt(
                                                            e.target.value,
                                                            10,
                                                        ),
                                                    })}
                                            />
                                        </FieldGroup>
                                    </div>

                                    <FieldGroup
                                        label={t("relay_host_label")}
                                        hint={t("relay_host_hint")}
                                    >
                                        <Select
                                            value={
                                                formData.relayHostId || "none"
                                            }
                                            onValueChange={(val) =>
                                                setFormData({
                                                    ...formData,
                                                    relayHostId:
                                                        val === "none"
                                                            ? undefined
                                                            : val,
                                                })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue
                                                    placeholder={t(
                                                        "relay_host_placeholder",
                                                    )}
                                                />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    {t("relay_host_none")}
                                                </SelectItem>
                                                {relayHostOptions.map(
                                                    (relayHost) => (
                                                        <SelectItem
                                                            key={relayHost.id}
                                                            value={relayHost.id}
                                                        >
                                                            {relayHost.name ||
                                                                relayHost.host}
                                                            {relayHost.host
                                                                ? ` (${relayHost.host})`
                                                                : ""}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </FieldGroup>
                                </HostFormSection>

                                <HostFormSection
                                    title={t("form_section_authentication")}
                                    description={t(
                                        "form_section_authentication_desc",
                                    )}
                                >
                                    {authFields}
                                </HostFormSection>

                                <HostFormSection
                                    title={t("form_section_terminal")}
                                    description={t(
                                        "form_section_terminal_desc",
                                    )}
                                >
                                    <FieldGroup
                                        label={t(
                                            "auto_password_identities_label",
                                        )}
                                        hint={t(
                                            "auto_password_identities_hint",
                                        )}
                                    >
                                        <div className="flex min-h-9 flex-wrap gap-2 rounded-md border border-border bg-background/50 p-2">
                                            {userpassIdentities.length ===
                                                0 && (
                                                <span className="text-xs text-muted-foreground">
                                                    {t(
                                                        "auto_password_identities_empty",
                                                    )}
                                                </span>
                                            )}
                                            {userpassIdentities.map(
                                                (identity) => {
                                                    const selected = (
                                                        formData.userpassIdentityIds ??
                                                        []
                                                    ).includes(identity.id);
                                                    return (
                                                        <Button
                                                            key={identity.id}
                                                            type="button"
                                                            size="sm"
                                                            variant={
                                                                selected
                                                                    ? "default"
                                                                    : "outline"
                                                            }
                                                            onClick={() =>
                                                                toggleAutoIdentity(
                                                                    identity.id,
                                                                )
                                                            }
                                                        >
                                                            {identity.name}
                                                        </Button>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </FieldGroup>

                                    <FieldGroup
                                        label={t("startup_command")}
                                        hint={t("startup_command_hint")}
                                    >
                                        <Input
                                            value={formData.startupCommand ?? ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    startupCommand:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="tmux attach -t main"
                                        />
                                    </FieldGroup>

                                    <FieldGroup label={t("terminal_font_size")}>
                                        <Input
                                            type="number"
                                            min={8}
                                            max={32}
                                            value={
                                                formData.terminalFontSize || ""
                                            }
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    terminalFontSize: e.target
                                                        .value
                                                        ? Number(e.target.value)
                                                        : undefined,
                                                })
                                            }
                                        />
                                    </FieldGroup>

                                    <FieldGroup
                                        label={t("terminal_font_family")}
                                    >
                                        <Input
                                            value={
                                                formData.terminalFontFamily ??
                                                ""
                                            }
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    terminalFontFamily:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="JetBrains Mono"
                                        />
                                    </FieldGroup>
                                </HostFormSection>
                            </>
                        )}

                        <HostFormSection title={t("form_section_organization")}>
                            <FieldGroup label={t("host_group_label")}>
                                <Select
                                    value={formData.groupId || "none"}
                                    onValueChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            groupId:
                                                val === "none"
                                                    ? undefined
                                                    : val,
                                        })}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={t(
                                                "select_group_placeholder",
                                            )}
                                        />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">
                                            {t("uncategorized")}
                                        </SelectItem>
                                        {groupOptions.map(
                                            ({ group, depth }) => (
                                                <SelectItem
                                                    key={group.id}
                                                    value={group.id}
                                                >
                                                    {"\u00A0".repeat(
                                                        depth * 2,
                                                    )}
                                                    {group.name}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </FieldGroup>
                        </HostFormSection>
                    </div>

                    <DialogFooter className="shrink-0">
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
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
