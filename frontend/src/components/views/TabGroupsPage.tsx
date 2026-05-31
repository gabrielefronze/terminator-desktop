import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import { TabGroupModal } from "@/components/views/TabGroupModal";
import { useAllHosts } from "@/hooks/useHosts";
import { useKeys } from "@/hooks/useKeys";
import { useIdentities } from "@/hooks/useIdentities";
import { useOpenTabGroup } from "@/hooks/useOpenTabGroup";
import {
    useTabGroups,
    useSaveTabGroup,
    useDeleteTabGroup,
} from "@/hooks/useTabGroups";
import { resolveTabGroupHosts, formatTabGroupHostList } from "@/lib/tabGroups";
import { TabGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";

export function TabGroupsPage() {
    const { t } = useTranslation(["tabgroups", "common"]);
    const { data: tabGroups, isLoading } = useTabGroups();
    const allHosts = useAllHosts();
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();
    const openTabGroup = useOpenTabGroup(keys, identities, allHosts);
    const saveTabGroup = useSaveTabGroup();
    const deleteTabGroup = useDeleteTabGroup();

    const [searchQuery, setSearchQuery] = useState("");
    const [editingGroup, setEditingGroup] = useState<TabGroup | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<TabGroup | null>(null);

    const filtered = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!tabGroups) return [];
        if (!query) return tabGroups;

        return tabGroups.filter((group) => {
            if (group.name.toLowerCase().includes(query)) return true;
            return resolveTabGroupHosts(group, allHosts).some((host) =>
                (host.name || host.host).toLowerCase().includes(query),
            );
        });
    }, [allHosts, searchQuery, tabGroups]);

    const handleSave = (group: TabGroup) => {
        saveTabGroup.mutate(group, {
            onSuccess: () => setEditingGroup(null),
        });
    };

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-8">
            <div className="mb-8 flex w-full items-center gap-4">
                <h1 className="shrink-0 text-2xl font-bold tracking-tight text-foreground">
                    {t("page_title")}
                </h1>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder={t("search_placeholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
                {t("page_description")}
            </p>

            {isLoading && (
                <p className="text-muted-foreground">
                    {t("loading", { ns: "common" })}
                </p>
            )}

            {!isLoading && filtered.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("empty_state")}</p>
            )}

            <div className="grid gap-3">
                {filtered.map((group) => {
                    const hosts = resolveTabGroupHosts(group, allHosts);

                    return (
                        <div
                            key={group.id}
                            className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4"
                        >
                            <button
                                type="button"
                                onClick={() => openTabGroup(group)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            >
                                <HostIconBadge
                                    icon={group.icon}
                                    color={group.color}
                                    className="size-10"
                                    iconClassName="size-5"
                                />
                                <div className="min-w-0">
                                    <div className="truncate font-medium">
                                        {group.name}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {hosts.length > 0
                                            ? formatTabGroupHostList(hosts)
                                            : t("no_hosts_available")}
                                    </div>
                                </div>
                            </button>

                            <div className="flex shrink-0 items-center gap-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingGroup(group)}
                                >
                                    {t("common:edit")}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    title={t("common:delete")}
                                    aria-label={t("common:delete")}
                                    onClick={() => setGroupToDelete(group)}
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <TabGroupModal
                isOpen={editingGroup != null}
                onClose={() => setEditingGroup(null)}
                onSave={handleSave}
                initialData={editingGroup}
                hostIds={editingGroup?.hostIds ?? []}
                allHosts={allHosts}
                isSaving={saveTabGroup.isPending}
            />

            <ConfirmModal
                isOpen={groupToDelete != null}
                onClose={() => setGroupToDelete(null)}
                onConfirm={() => {
                    if (!groupToDelete) return;
                    deleteTabGroup.mutate(groupToDelete.id, {
                        onSuccess: () => setGroupToDelete(null),
                    });
                }}
                title={t("delete_title")}
                description={t("delete_description", {
                    name: groupToDelete?.name ?? "",
                })}
                confirmText={t("common:delete")}
                isDestructive
            />
        </div>
    );
}
