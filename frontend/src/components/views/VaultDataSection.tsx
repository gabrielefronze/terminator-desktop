import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileUp, FolderOpen, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SettingsCard } from "@/components/ui/settings-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    useExportVault,
    useImportSSHConfig,
    useImportSSHConfigWithDialog,
    useImportVault,
} from "@/hooks/useVaultTransfer";
import { ImportResult } from "../../../bindings/terminator-desktop/backend/internal/services/vaulttransfer";
import type { TFunction } from "i18next";

function formatImportSummary(result: ImportResult, t: TFunction<"settings">) {
    const parts = [
        result.hostsImported > 0 &&
            t("import_summary_hosts", { count: result.hostsImported }),
        result.keysImported > 0 &&
            t("import_summary_keys", { count: result.keysImported }),
        result.identitiesImported > 0 &&
            t("import_summary_identities", { count: result.identitiesImported }),
        result.snippetsImported > 0 &&
            t("import_summary_snippets", { count: result.snippetsImported }),
        result.forwardsImported > 0 &&
            t("import_summary_forwards", { count: result.forwardsImported }),
        result.groupsImported > 0 &&
            t("import_summary_groups", { count: result.groupsImported }),
        result.tabGroupsImported > 0 &&
            t("import_summary_tab_groups", { count: result.tabGroupsImported }),
        result.knownHostsMerged > 0 &&
            t("import_summary_known_hosts", { count: result.knownHostsMerged }),
    ].filter(Boolean);

    if (parts.length === 0) {
        return t("import_summary_empty");
    }
    return parts.join(" · ");
}

export function VaultDataSection() {
    const { t } = useTranslation("settings");
    const exportVault = useExportVault();
    const importVault = useImportVault();
    const importSSHConfig = useImportSSHConfig();
    const importSSHConfigDialog = useImportSSHConfigWithDialog();

    const [mergeKnownHosts, setMergeKnownHosts] = useState(true);
    const [exportOpen, setExportOpen] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [exportEncrypted, setExportEncrypted] = useState(true);
    const [exportPassword, setExportPassword] = useState("");
    const [importPassword, setImportPassword] = useState("");

    const handleImportResult = (result: ImportResult) => {
        if (result.cancelled) {
            return;
        }
        toast.success(formatImportSummary(result, t));
    };

    const runExport = async () => {
        if (exportEncrypted && !exportPassword) {
            return;
        }
        const result = await exportVault.mutateAsync({
            encrypted: exportEncrypted,
            password: exportPassword,
        });
        setExportOpen(false);
        setExportPassword("");
        if (result.cancelled) {
            return;
        }
        toast.success(t("export_success", { path: result.path }));
    };

    const runImport = async () => {
        const result = await importVault.mutateAsync(importPassword);
        setImportOpen(false);
        setImportPassword("");
        handleImportResult(result);
    };

    const runSSHConfigDefault = async () => {
        const result = await importSSHConfig.mutateAsync({
            configPath: "",
            mergeKnownHosts,
        });
        handleImportResult(result);
    };

    const runSSHConfigFile = async () => {
        const result = await importSSHConfigDialog.mutateAsync(mergeKnownHosts);
        handleImportResult(result);
    };

    const busy =
        exportVault.isPending ||
        importVault.isPending ||
        importSSHConfig.isPending ||
        importSSHConfigDialog.isPending;

    return (
        <>
            <SettingsCard
                title={t("vault_data_title")}
                description={t("vault_data_desc")}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => setExportOpen(true)}
                        >
                            <Download className="mr-2 size-4" />
                            {t("export_vault_btn")}
                        </Button>
                        <Button
                            variant="outline"
                            disabled={busy}
                            onClick={() => setImportOpen(true)}
                        >
                            <Upload className="mr-2 size-4" />
                            {t("import_vault_btn")}
                        </Button>
                    </div>

                    <div className="h-px w-full bg-border" />

                    <div className="flex flex-col gap-3">
                        <span className="text-sm font-medium text-foreground">
                            {t("ssh_config_import_title")}
                        </span>
                        <p className="text-xs text-muted-foreground">
                            {t("ssh_config_import_desc")}
                        </p>
                        <div className="flex items-center justify-between gap-4">
                            <Label
                                htmlFor="merge-known-hosts"
                                className="text-sm text-muted-foreground"
                            >
                                {t("merge_known_hosts_label")}
                            </Label>
                            <Switch
                                id="merge-known-hosts"
                                checked={mergeKnownHosts}
                                onCheckedChange={setMergeKnownHosts}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => void runSSHConfigDefault()}
                            >
                                <FileUp className="mr-2 size-4" />
                                {t("import_ssh_config_default_btn")}
                            </Button>
                            <Button
                                variant="outline"
                                disabled={busy}
                                onClick={() => void runSSHConfigFile()}
                            >
                                <FolderOpen className="mr-2 size-4" />
                                {t("import_ssh_config_choose_btn")}
                            </Button>
                        </div>
                    </div>
                </div>
            </SettingsCard>

            <Dialog open={exportOpen} onOpenChange={setExportOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("export_vault_title")}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-muted-foreground">
                            {t("export_vault_desc")}
                        </p>
                        <div className="flex items-center justify-between gap-4">
                            <Label htmlFor="export-encrypted">
                                {t("export_encrypted_label")}
                            </Label>
                            <Switch
                                id="export-encrypted"
                                checked={exportEncrypted}
                                onCheckedChange={setExportEncrypted}
                            />
                        </div>
                        {exportEncrypted && (
                            <div className="flex flex-col gap-2">
                                <Label htmlFor="export-password">
                                    {t("export_password_label")}
                                </Label>
                                <Input
                                    id="export-password"
                                    type="password"
                                    value={exportPassword}
                                    onChange={(e) =>
                                        setExportPassword(e.target.value)
                                    }
                                    autoComplete="new-password"
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setExportOpen(false)}
                        >
                            {t("cancel", { ns: "common" })}
                        </Button>
                        <Button
                            disabled={
                                exportVault.isPending ||
                                (exportEncrypted && !exportPassword)
                            }
                            onClick={() => void runExport()}
                        >
                            {t("export_vault_confirm_btn")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t("import_vault_title")}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-muted-foreground">
                            {t("import_vault_desc")}
                        </p>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="import-password">
                                {t("import_password_label")}
                            </Label>
                            <Input
                                id="import-password"
                                type="password"
                                value={importPassword}
                                onChange={(e) =>
                                    setImportPassword(e.target.value)
                                }
                                autoComplete="current-password"
                                placeholder={t("import_password_placeholder")}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setImportOpen(false)}
                        >
                            {t("cancel", { ns: "common" })}
                        </Button>
                        <Button
                            disabled={importVault.isPending}
                            onClick={() => void runImport()}
                        >
                            {t("import_vault_confirm_btn")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
