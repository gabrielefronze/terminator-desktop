import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { TabGroupCard } from "@/components/views/TabGroupCard";
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
import { resolveTabGroupHosts } from "@/lib/tabGroups";
import { ResourceGrid, ResourceGridItem } from "@/components/views/ResourceGrid";
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
                <SearchInput
                    placeholder={t("search_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
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

            <ResourceGrid>
                {filtered.map((group) => (
                    <ResourceGridItem key={group.id}>
                        <TabGroupCard
                            group={group}
                            hosts={resolveTabGroupHosts(group, allHosts)}
                            onOpen={openTabGroup}
                            onEdit={setEditingGroup}
                            onDelete={setGroupToDelete}
                        />
                    </ResourceGridItem>
                ))}
            </ResourceGrid>

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
