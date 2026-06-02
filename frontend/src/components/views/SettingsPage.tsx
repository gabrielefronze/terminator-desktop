import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    User,
    Server,
    Lock,
    Trash2,
    Globe,
    AlertTriangle,
    Type,
    Monitor,
    Paintbrush,
    Fingerprint,
    Sparkles,
    Keyboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SwitchServerModal } from "@/components/views/SwitchServerModal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SettingsCard } from "@/components/ui/settings-card";
import { useCurrentUser } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useSessionStore } from "@/store/sessionStore";
import { AuthService } from "../../../bindings/terminator-desktop/backend/internal/services/auth";
import { AppSettings, SettingsService } from "../../../bindings/terminator-desktop/backend/internal/services/settings";
import { handleAppError } from "@/lib/error";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useSyncStore } from "@/store/syncStore.ts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings, useSaveSettings, useSystemFonts } from "@/hooks/useSettings";
import { DEFAULT_TERMINAL_FONT_SIZE } from "@/lib/terminalTheme";
import {
    DEFAULT_TERMINAL_FONT_NAME,
    parseStoredFontFamily,
} from "@/lib/terminalFont";
import { TerminalFontSelect } from "@/components/views/TerminalFontSelect";
import { Switch } from "@/components/ui/switch";
import { useLocalhostHostSetting } from "@/hooks/useLocalhostHostSetting";
import { useBiometric } from "@/hooks/useBiometric";
import { AppBackgroundPicker } from "@/components/views/AppBackgroundPicker";
import { AccentColorPicker } from "@/components/views/AccentColorPicker";
import {
    DEFAULT_APP_BACKGROUND_COLOR,
    normalizeAppBackgroundColor,
} from "@/lib/appTheme";
import { applyAppTheme } from "@/lib/appThemeApply";
import {
    DEFAULT_ACCENT_COLOR,
    normalizeAccentColor,
} from "@/lib/accentTheme";
import { VaultDataSection } from "@/components/views/VaultDataSection";
import { lockVaultFromUI } from "@/lib/vaultLock";
import { Service as CommandHistoryService } from "../../../bindings/terminator-desktop/backend/internal/services/commandhistory";
import { toast } from "sonner";
import { useUIStore } from "@/store/uiStore";

export function SettingsPage() {
    const {t, i18n} = useTranslation([
        "settings",
        "common",
        "errors",
        "commandHistory",
        "shortcuts",
    ]);
    const {data: user, refetch} = useCurrentUser();
    const {setUnlocked, setHasUser} = useAuthStore();
    const openShortcutsOverlay = useUIStore((s) => s.openShortcutsOverlay);
    const {clearSessions} = useSessionStore();
    const {lastError} = useSyncStore();

    const [isServerModalOpen, setIsServerModalOpen] = useState(false);
    const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
    const [isClearHistoryModalOpen, setIsClearHistoryModalOpen] = useState(false);
    const { data: settings } = useSettings();
    const { data: systemFonts, isLoading: isFontsLoading } = useSystemFonts();
    const saveSettingsMutation = useSaveSettings();
    const {
        enabled: localhostHostEnabled,
        setEnabled: setLocalhostHostEnabled,
        isPending: isLocalhostHostPending,
    } = useLocalhostHostSetting();
    const [terminalFontFamily, setTerminalFontFamily] = useState(
        DEFAULT_TERMINAL_FONT_NAME,
    );
    const [terminalFontSize, setTerminalFontSize] = useState(
        DEFAULT_TERMINAL_FONT_SIZE,
    );
    const [appBackgroundColor, setAppBackgroundColor] = useState(
        DEFAULT_APP_BACKGROUND_COLOR,
    );
    const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT_COLOR);
    const biometric = useBiometric();
    const [touchIdPassword, setTouchIdPassword] = useState("");
    const [touchIdEnabling, setTouchIdEnabling] = useState(false);
    const [showTouchIdSetup, setShowTouchIdSetup] = useState(false);

    useEffect(() => {
        if (!settings) return;
        setTerminalFontFamily(
            parseStoredFontFamily(settings.terminalFontFamily),
        );
        setTerminalFontSize(
            settings.terminalFontSize > 0
                ? settings.terminalFontSize
                : DEFAULT_TERMINAL_FONT_SIZE,
        );
        setAppBackgroundColor(
            normalizeAppBackgroundColor(settings.appBackgroundColor),
        );
        setAccentColor(normalizeAccentColor(settings.accentColor));
    }, [settings]);

    const handleTouchIdToggle = async (checked: boolean) => {
        if (!checked) {
            try {
                await AuthService.DisableBiometric();
                await biometric.refresh();
                setShowTouchIdSetup(false);
                setTouchIdPassword("");
            } catch (error) {
                handleAppError(error);
            }
            return;
        }
        setShowTouchIdSetup(true);
    };

    const handleEnableTouchId = async () => {
        if (!touchIdPassword) return;
        setTouchIdEnabling(true);
        try {
            await AuthService.EnableBiometric(touchIdPassword);
            setTouchIdPassword("");
            setShowTouchIdSetup(false);
            await biometric.refresh();
        } catch (error) {
            handleAppError(error);
        } finally {
            setTouchIdEnabling(false);
        }
    };

    const handleLockVault = async () => {
        try {
            await lockVaultFromUI();
        } catch (error) {
            handleAppError(error);
        }
    };

    const handleWipeData = async () => {
        try {
            clearSessions();
            await AuthService.WipeData();
            setUnlocked(false);
            setHasUser(false);
        } catch (error) {
            handleAppError(error);
        }
    };

    const persistSettings = async (patch: Partial<AppSettings>) => {
        const current = settings ?? (await SettingsService.GetSettings());
        await saveSettingsMutation.mutateAsync(
            new AppSettings({ ...current, ...patch }),
        );
    };

    const changeLanguage = async (lng: string) => {
        try {
            await persistSettings({ language: lng });
            void i18n.changeLanguage(lng);
        } catch (error) {
            handleAppError(error);
        }
    };

    const changeTerminalFontFamily = async (family: string) => {
        setTerminalFontFamily(family);
        try {
            await persistSettings({ terminalFontFamily: family });
        } catch (error) {
            handleAppError(error);
        }
    };

    const saveTerminalFontSize = async () => {
        const size = Math.min(
            32,
            Math.max(8, Number(terminalFontSize) || DEFAULT_TERMINAL_FONT_SIZE),
        );
        setTerminalFontSize(size);
        try {
            await persistSettings({ terminalFontSize: size });
        } catch (error) {
            handleAppError(error);
        }
    };

    const changeAppBackgroundColor = async (color: string) => {
        const normalized = normalizeAppBackgroundColor(color);
        setAppBackgroundColor(normalized);
        applyAppTheme(normalized, accentColor);
        try {
            await persistSettings({ appBackgroundColor: normalized });
        } catch (error) {
            handleAppError(error);
        }
    };

    const resetAppBackgroundColor = async () => {
        setAppBackgroundColor(DEFAULT_APP_BACKGROUND_COLOR);
        applyAppTheme(DEFAULT_APP_BACKGROUND_COLOR, accentColor);
        try {
            await persistSettings({
                appBackgroundColor: DEFAULT_APP_BACKGROUND_COLOR,
            });
        } catch (error) {
            handleAppError(error);
        }
    };

    const changeAccentColor = async (color: string) => {
        const normalized = normalizeAccentColor(color);
        setAccentColor(normalized);
        applyAppTheme(appBackgroundColor, normalized);
        try {
            await persistSettings({ accentColor: normalized });
        } catch (error) {
            handleAppError(error);
        }
    };

    const resetAccentColor = async () => {
        setAccentColor(DEFAULT_ACCENT_COLOR);
        applyAppTheme(appBackgroundColor, DEFAULT_ACCENT_COLOR);
        try {
            await persistSettings({ accentColor: DEFAULT_ACCENT_COLOR });
        } catch (error) {
            handleAppError(error);
        }
    };

    const resetTerminalFont = async () => {
        setTerminalFontFamily(DEFAULT_TERMINAL_FONT_NAME);
        setTerminalFontSize(DEFAULT_TERMINAL_FONT_SIZE);
        try {
            await persistSettings({
                terminalFontFamily: DEFAULT_TERMINAL_FONT_NAME,
                terminalFontSize: DEFAULT_TERMINAL_FONT_SIZE,
            });
        } catch (error) {
            handleAppError(error);
        }
    };

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-8">

            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("page_title")}</h1>

                <SettingsCard title={t("profile_sync_title")} description={t("profile_sync_desc")}>
                    <div className="flex items-center gap-4">
                        <div
                            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <User className="size-6"/>
                        </div>
                        <div className="flex flex-col">
                            <span
                                className="text-sm font-medium text-muted-foreground">{t("username", {ns: "common"})}</span>
                            <span className="text-lg font-semibold text-foreground">
                                {user?.username || t("loading", {ns: "common"})}
                            </span>
                        </div>
                    </div>

                    <div
                        className="flex items-center justify-between
                                   rounded-lg border border-border bg-background p-4">
                        <div className="flex items-center gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center
                                           rounded-lg bg-info/10 text-info">
                                <Server className="size-5"/>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                    {t("cloud_server_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {user?.serverUrl ? user.serverUrl : t("local_vault_only")}
                                </span>
                            </div>
                        </div>
                        <Button variant="secondary" onClick={() => setIsServerModalOpen(true)}>
                            {user?.serverUrl ? t("switch_server_btn") : t("connect_btn")}
                        </Button>
                    </div>

                    {lastError && (
                        <div className="p-4 flex items-start gap-3 text-destructive
                                        border border-destructive/20 bg-destructive/10 rounded-lg">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium">{t("sync_offline")}</span>
                                <span className="text-xs opacity-90">
                                    {t(`errors:${lastError.code}`, { defaultValue: lastError.message })}
                                </span>
                                {lastError.detailsString && (
                                    <span className="mt-1 text-2xs font-mono opacity-75">
                                        {lastError.detailsString}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </SettingsCard>

                <VaultDataSection />

                <SettingsCard
                    title={t("shortcuts_title")}
                    description={t("shortcuts_desc")}
                >
                    <div
                        className="flex items-center justify-between rounded-lg border border-border bg-background p-4"
                    >
                        <div className="flex items-center gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            >
                                <Keyboard className="size-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                    {t("shortcuts:open_cheatsheet")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("shortcuts:open_cheatsheet_hint")}
                                </span>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={openShortcutsOverlay}
                        >
                            {t("shortcuts:view_shortcuts_btn")}
                        </Button>
                    </div>
                </SettingsCard>

                <SettingsCard title={t("preferences_title")}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center
                                           rounded-lg bg-primary/10 text-primary">
                                <Globe className="size-5"/>
                            </div>
                            <span className="text-sm font-medium text-foreground">
                                {t("language_label")}
                            </span>
                        </div>
                        <Select value={i18n.resolvedLanguage} onValueChange={changeLanguage}>
                            <SelectTrigger className="w-45">
                                <SelectValue placeholder={t("select_language")}/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="de">Deutsch</SelectItem>
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="it">Italiano</SelectItem>
                                <SelectItem value="ru">Русский</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            >
                                <Paintbrush className="size-5" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">
                                    {t("app_background_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("app_background_desc")}
                                </span>
                            </div>
                        </div>
                        <AppBackgroundPicker
                            value={appBackgroundColor}
                            onChange={(color) => void changeAppBackgroundColor(color)}
                            onReset={() => void resetAppBackgroundColor()}
                        />
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            >
                                <Sparkles className="size-5" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">
                                    {t("accent_color_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("accent_color_desc")}
                                </span>
                            </div>
                        </div>
                        <AccentColorPicker
                            value={accentColor}
                            onChange={(color) => void changeAccentColor(color)}
                            onReset={() => void resetAccentColor()}
                        />
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center
                                           rounded-lg bg-primary/10 text-primary"
                            >
                                <Monitor className="size-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                    {t("show_localhost_host_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("show_localhost_host_desc")}
                                </span>
                            </div>
                        </div>
                        <Switch
                            checked={localhostHostEnabled}
                            disabled={isLocalhostHostPending}
                            onCheckedChange={(checked) =>
                                void setLocalhostHostEnabled(checked)
                            }
                        />
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            >
                                <Type className="size-5" />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">
                                    {t("terminal_font_family_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("terminal_font_family_desc")}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-0 flex-1 basis-48">
                                <TerminalFontSelect
                                    value={terminalFontFamily}
                                    fonts={systemFonts ?? []}
                                    isLoading={isFontsLoading}
                                    onValueChange={(family) =>
                                        void changeTerminalFontFamily(family)
                                    }
                                />
                            </div>
                            <div className="flex shrink-0 flex-col gap-2">
                                <Label
                                    htmlFor="terminal-font-size"
                                    className="text-xs text-muted-foreground"
                                >
                                    {t("terminal_font_size_label")}
                                </Label>
                                <Input
                                    id="terminal-font-size"
                                    type="number"
                                    min={8}
                                    max={32}
                                    value={terminalFontSize}
                                    onChange={(e) =>
                                        setTerminalFontSize(
                                            Number(e.target.value),
                                        )
                                    }
                                    onBlur={() => void saveTerminalFontSize()}
                                    className="h-8 w-20"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 shrink-0"
                                onClick={() => void resetTerminalFont()}
                            >
                                {t("terminal_reset_font_btn")}
                            </Button>
                        </div>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 flex-1 items-start gap-4">
                            <div
                                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                            >
                                <Monitor className="size-5" />
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                                <span className="text-sm font-medium text-foreground">
                                    {t("terminal_webgl_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("terminal_webgl_desc")}
                                </span>
                            </div>
                        </div>
                        <Switch
                            checked={settings?.terminalWebglRenderer ?? true}
                            disabled={saveSettingsMutation.isPending}
                            onCheckedChange={(checked) => {
                                void persistSettings({
                                    terminalWebglRenderer: checked,
                                }).catch(handleAppError);
                            }}
                        />
                    </div>
                </SettingsCard>

                <SettingsCard title={t("security_title")} description={t("security_desc")}>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="font-medium text-foreground">{t("lock_vault_title")}</span>
                            <span className="text-xs text-muted-foreground">{t("lock_vault_desc")}</span>
                        </div>
                        <Button variant="outline" onClick={handleLockVault}>
                            <Lock className="mr-2 size-4"/>
                            {t("lock_btn")}
                        </Button>
                    </div>

                    {biometric.available && (
                        <>
                            <div className="my-2 h-px w-full bg-border" />
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                                        >
                                            <Fingerprint className="size-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-foreground">
                                                {t("touch_id_label")}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {t("touch_id_desc")}
                                            </span>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={biometric.enabled}
                                        onCheckedChange={(checked) =>
                                            void handleTouchIdToggle(checked)
                                        }
                                    />
                                </div>
                                {showTouchIdSetup && !biometric.enabled && (
                                    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-4">
                                        <p className="text-xs text-muted-foreground">
                                            {t("touch_id_password_hint")}
                                        </p>
                                        <Input
                                            type="password"
                                            value={touchIdPassword}
                                            onChange={(e) =>
                                                setTouchIdPassword(e.target.value)
                                            }
                                            autoComplete="current-password"
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setShowTouchIdSetup(false);
                                                    setTouchIdPassword("");
                                                }}
                                            >
                                                {t("cancel", { ns: "common" })}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                disabled={
                                                    touchIdEnabling || !touchIdPassword
                                                }
                                                onClick={() => void handleEnableTouchId()}
                                            >
                                                {t("touch_id_enable_btn")}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    <div className="my-2 h-px w-full bg-border" />

                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    {t("commandHistory:settings_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("commandHistory:settings_desc")}
                                </span>
                            </div>
                            <Switch
                                checked={settings?.commandHistoryEnabled ?? true}
                                disabled={saveSettingsMutation.isPending}
                                onCheckedChange={(checked) => {
                                    void persistSettings({
                                        commandHistoryEnabled: checked,
                                    }).catch(handleAppError);
                                }}
                            />
                        </div>

                        {settings?.commandHistoryEnabled !== false && (
                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-muted-foreground">
                                    {t("commandHistory:clear_all")}
                                </span>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsClearHistoryModalOpen(true)}
                                >
                                    {t("commandHistory:clear_all")}
                                </Button>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    {t("session_restore_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("session_restore_desc")}
                                </span>
                            </div>
                            <Switch
                                checked={settings?.sessionRestoreEnabled ?? true}
                                disabled={saveSettingsMutation.isPending}
                                onCheckedChange={(checked) => {
                                    void persistSettings({
                                        sessionRestoreEnabled: checked,
                                    }).catch(handleAppError);
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    {t("ssh_keep_alive_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("ssh_keep_alive_desc")}
                                </span>
                            </div>
                            <Switch
                                checked={settings?.sshKeepAliveEnabled ?? true}
                                disabled={saveSettingsMutation.isPending}
                                onCheckedChange={(checked) => {
                                    void persistSettings({
                                        sshKeepAliveEnabled: checked,
                                    }).catch(handleAppError);
                                }}
                            />
                        </div>

                        {settings?.sshKeepAliveEnabled !== false && (
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <Label
                                    htmlFor="ssh-keep-alive-interval"
                                    className="text-sm text-muted-foreground"
                                >
                                    {t("ssh_keep_alive_interval_label")}
                                </Label>
                                <Input
                                    id="ssh-keep-alive-interval"
                                    type="number"
                                    min={5}
                                    max={300}
                                    className="w-24"
                                    value={settings?.sshKeepAliveIntervalSeconds ?? 30}
                                    disabled={saveSettingsMutation.isPending}
                                    onChange={(event) => {
                                        const parsed = Number.parseInt(
                                            event.target.value,
                                            10,
                                        );
                                        if (Number.isNaN(parsed)) {
                                            return;
                                        }
                                        void persistSettings({
                                            sshKeepAliveIntervalSeconds: parsed,
                                        }).catch(handleAppError);
                                    }}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    {t("ssh_reconnect_prompt_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("ssh_reconnect_prompt_desc")}
                                </span>
                            </div>
                            <Switch
                                checked={settings?.sshReconnectPromptEnabled ?? true}
                                disabled={saveSettingsMutation.isPending}
                                onCheckedChange={(checked) => {
                                    void persistSettings({
                                        sshReconnectPromptEnabled: checked,
                                    }).catch(handleAppError);
                                }}
                            />
                        </div>

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    {t("vault_auto_lock_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("vault_auto_lock_desc")}
                                </span>
                            </div>
                            <Switch
                                checked={settings?.vaultAutoLockEnabled ?? false}
                                disabled={saveSettingsMutation.isPending}
                                onCheckedChange={(checked) => {
                                    void persistSettings({
                                        vaultAutoLockEnabled: checked,
                                    }).catch(handleAppError);
                                }}
                            />
                        </div>

                        {settings?.vaultAutoLockEnabled && (
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <Label
                                    htmlFor="vault-auto-lock-minutes"
                                    className="text-sm text-muted-foreground"
                                >
                                    {t("vault_auto_lock_minutes_label")}
                                </Label>
                                <Select
                                    value={String(
                                        settings.vaultAutoLockMinutes > 0
                                            ? settings.vaultAutoLockMinutes
                                            : 15,
                                    )}
                                    onValueChange={(value) => {
                                        void persistSettings({
                                            vaultAutoLockMinutes: Number(value),
                                        }).catch(handleAppError);
                                    }}
                                >
                                    <SelectTrigger
                                        id="vault-auto-lock-minutes"
                                        className="w-36"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="5">
                                            {t("vault_auto_lock_minutes_option", {
                                                count: 5,
                                            })}
                                        </SelectItem>
                                        <SelectItem value="15">
                                            {t("vault_auto_lock_minutes_option", {
                                                count: 15,
                                            })}
                                        </SelectItem>
                                        <SelectItem value="30">
                                            {t("vault_auto_lock_minutes_option", {
                                                count: 30,
                                            })}
                                        </SelectItem>
                                        <SelectItem value="60">
                                            {t("vault_auto_lock_minutes_option", {
                                                count: 60,
                                            })}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-foreground">
                                    {t("vault_auto_lock_on_sleep_label")}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {t("vault_auto_lock_on_sleep_desc")}
                                </span>
                            </div>
                            <Switch
                                checked={settings?.vaultAutoLockOnSleep ?? false}
                                disabled={saveSettingsMutation.isPending}
                                onCheckedChange={(checked) => {
                                    void persistSettings({
                                        vaultAutoLockOnSleep: checked,
                                    }).catch(handleAppError);
                                }}
                            />
                        </div>
                    </div>

                    <div className="my-2 h-px w-full bg-border"/>

                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="font-medium text-destructive">{t("wipe_data_title")}</span>
                            <span className="text-xs text-muted-foreground">{t("wipe_data_desc")}</span>
                        </div>
                        <Button variant="destructive" onClick={() => setIsWipeModalOpen(true)}>
                            <Trash2 className="mr-2 size-4"/>
                            {t("wipe_btn")}
                        </Button>
                    </div>
                </SettingsCard>

            </div>

            <SwitchServerModal
                isOpen={isServerModalOpen}
                onClose={() => setIsServerModalOpen(false)}
                currentUrl={user?.serverUrl || ""}
                onSuccess={() => refetch()}
            />

            <ConfirmModal
                isOpen={isWipeModalOpen}
                onClose={() => setIsWipeModalOpen(false)}
                onConfirm={handleWipeData}
                title={t("wipe_confirm_title")}
                description={t("wipe_confirm_desc")}
                confirmText={t("nuke_it")}
                isDestructive={true}
            />

            <ConfirmModal
                isOpen={isClearHistoryModalOpen}
                onClose={() => setIsClearHistoryModalOpen(false)}
                onConfirm={() => {
                    void CommandHistoryService.Clear()
                        .then(() => {
                            toast.success(t("commandHistory:cleared_toast"));
                            setIsClearHistoryModalOpen(false);
                        })
                        .catch(handleAppError);
                }}
                title={t("commandHistory:clear_all_confirm_title")}
                description={t("commandHistory:clear_all_confirm_desc")}
                isDestructive
            />

        </div>
    );
}