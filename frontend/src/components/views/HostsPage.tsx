import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, FolderPlus } from "lucide-react";
import {
    DndContext,
    DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { HostCard } from "@/components/views/HostCard";
import { HostModal } from "@/components/views/HostModal";
import { HostGroupModal } from "@/components/views/HostGroupModal";
import {
    HostGroupSection,
    HostGroupsList,
    UncategorizedHostSection,
} from "@/components/views/HostGroupSection";
import { DraggableHostCard } from "@/components/views/DraggableHostCard";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useSaveHost, useDeleteHost } from "@/hooks/useHosts";
import { useHosts } from "@/hooks/useHosts";
import { useHostsWithoutBuiltin } from "@/hooks/useResolvedLocalhostHost";
import { useConnectHost } from "@/hooks/useConnectHost";
import { HostKeyTrustModal } from "@/components/terminal/HostKeyTrustModal";
import {
    useHostGroups,
    useSaveHostGroup,
    useDeleteHostGroup,
} from "@/hooks/useHostGroups";
import { useKeys } from "@/hooks/useKeys";
import { useIdentities } from "@/hooks/useIdentities";
import { Host, HostGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { collectAllHostTags } from "@/lib/hostSearch";
import { buildHostTree, filterHostTree } from "@/lib/hostTree";
import { cn } from "@/lib/utils";
import { useHostReachability } from "@/hooks/useHostReachability";

export function HostsPage() {
    const { t } = useTranslation(["hosts", "common"]);
    const { data: allHosts } = useHosts();
    const { data: hosts, isLoading } = useHostsWithoutBuiltin();
    const { byId: reachabilityById, isChecking: reachabilityChecking } =
        useHostReachability(hosts);
    const { data: groups } = useHostGroups();
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();

    const saveHostMutation = useSaveHost();
    const deleteHostMutation = useDeleteHost();
    const saveGroupMutation = useSaveHostGroup();
    const deleteGroupMutation = useDeleteHostGroup();
    const {
        connect,
        connectSplitWithLocal,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    } = useConnectHost(keys, identities, allHosts);

    const [isHostModalOpen, setIsHostModalOpen] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [editingHost, setEditingHost] = useState<Host | null>(null);
    const [editingGroup, setEditingGroup] = useState<HostGroup | null>(null);
    const [hostToDelete, setHostToDelete] = useState<Host | null>(null);
    const [groupToDelete, setGroupToDelete] = useState<HostGroup | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [tagFilter, setTagFilter] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    const hostTree = useMemo(() => {
        if (!hosts || !groups) return null;
        const tree = buildHostTree(hosts, groups);
        return filterHostTree(tree, searchQuery, tagFilter);
    }, [hosts, groups, searchQuery, tagFilter]);

    const allTags = useMemo(
        () => (hosts ? collectAllHostTags(hosts) : []),
        [hosts],
    );

    const hasAnyVisibleHosts = useMemo(() => {
        if (!hostTree) return false;
        const countInNode = (nodes: typeof hostTree.roots): number =>
            nodes.reduce(
                (sum, n) =>
                    sum +
                    n.hosts.length +
                    countInNode(n.children),
                0,
            );
        return (
            countInNode(hostTree.roots) + hostTree.uncategorized.length > 0
        );
    }, [hostTree]);

    const handleCreateHost = () => {
        setSearchQuery("");
        setEditingHost(null);
        setIsHostModalOpen(true);
    };

    const handleCreateGroup = () => {
        setSearchQuery("");
        setEditingGroup(null);
        setIsGroupModalOpen(true);
    };

    const handleEditHost = (host: Host) => {
        setEditingHost(host);
        setIsHostModalOpen(true);
    };

    const handleEditGroup = (group: HostGroup) => {
        setEditingGroup(group);
        setIsGroupModalOpen(true);
    };

    const handleDeleteHostPrompt = (host: Host) => {
        setHostToDelete(host);
    };

    const handleDeleteGroupPrompt = (group: HostGroup) => {
        setGroupToDelete(group);
    };

    const handleConfirmDeleteHost = () => {
        if (hostToDelete) deleteHostMutation.mutate(hostToDelete.id);
        setHostToDelete(null);
    };

    const handleConfirmDeleteGroup = async () => {
        if (!groupToDelete || !hosts) {
            setGroupToDelete(null);
            return;
        }

        const affected = hosts.filter((h) => h.groupId === groupToDelete.id);
        try {
            for (const host of affected) {
                await saveHostMutation.mutateAsync(
                    new Host({ ...host, groupId: undefined }),
                );
            }
            await deleteGroupMutation.mutateAsync(groupToDelete.id);
        } catch {
            // errors handled by mutation hooks
        }
        setGroupToDelete(null);
    };

    const handleSaveHost = (host: Host) => {
        const isNew = editingHost === null;
        const normalized = new Host({
            ...host,
            groupId:
                host.groupId === "none" || !host.groupId
                    ? undefined
                    : host.groupId,
        });
        saveHostMutation.mutate(normalized, {
            onSuccess: () => {
                setIsHostModalOpen(false);
                if (isNew) setSearchQuery("");
            },
        });
    };

    const handleSaveGroup = (group: HostGroup) => {
        const isNew = editingGroup === null;
        saveGroupMutation.mutate(group, {
            onSuccess: () => {
                setIsGroupModalOpen(false);
                if (isNew) setSearchQuery("");
            },
        });
    };

    const handleConnect = (host: Host) => {
        void connect(host);
    };

    const handleSplitWithLocal = (host: Host) => {
        void connectSplitWithLocal(host);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || !hosts) return;

        const activeData = active.data.current;
        if (activeData?.type !== "host") return;

        const host = activeData.host as Host;
        const overData = over.data.current;
        if (overData?.type !== "group") return;

        const targetGroupId = overData.groupId as string | null;
        const currentGroupId = host.groupId || null;

        if (targetGroupId === currentGroupId) return;

        saveHostMutation.mutate(
            new Host({
                ...host,
                groupId: targetGroupId ?? undefined,
            }),
        );
    };

    const renderHostCard = (
        host: Host,
        handlers: {
            onConnect: (host: Host) => void;
            onSplitWithLocal?: (host: Host) => void;
            onEdit: (host: Host) => void;
            onDelete: (host: Host) => void;
        },
    ) => (
        <DraggableHostCard host={host}>
            <HostCard
                host={host}
                reachability={reachabilityById.get(host.id)}
                reachabilityChecking={reachabilityChecking}
                onConnect={handlers.onConnect}
                onSplitWithLocal={handlers.onSplitWithLocal}
                onEdit={handlers.onEdit}
                onDelete={handlers.onDelete}
            />
        </DraggableHostCard>
    );

    const showEmptyState =
        !isLoading &&
        (hosts?.length ?? 0) === 0 &&
        (groups?.length ?? 0) === 0;

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-8">
            <div className="mb-8 flex w-full items-center gap-4">
                <h1 className="shrink-0 text-2xl font-bold tracking-tight text-foreground">
                    {t("page_title")}
                </h1>
                <SearchInput
                    placeholder={t("search_hosts")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Button
                    variant="outline"
                    onClick={handleCreateGroup}
                    className="shrink-0"
                >
                    <FolderPlus />
                    {t("new_group")}
                </Button>
                <Button onClick={handleCreateHost} className="shrink-0">
                    <Plus />
                    {t("new_host")}
                </Button>
            </div>

            {allTags.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                        {t("filter_by_tag")}
                    </span>
                    <button
                        type="button"
                        onClick={() => setTagFilter(null)}
                        className={cn(
                            "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                            tagFilter === null
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:bg-muted/60",
                        )}
                    >
                        {t("tag_filter_all")}
                    </button>
                    {allTags.map((tag) => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() =>
                                setTagFilter((current) =>
                                    current === tag ? null : tag,
                                )
                            }
                            className={cn(
                                "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                                tagFilter === tag
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-muted-foreground hover:bg-muted/60",
                            )}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            {isLoading && (
                <div className="text-sm text-muted-foreground">
                    {t("loading_hosts")}
                </div>
            )}

            {showEmptyState && (
                <div
                    className="flex flex-col items-center justify-center rounded-xl border-2
                               border-dashed border-border py-16 text-center"
                >
                    <h3 className="text-lg font-semibold text-foreground">
                        {t("empty_title")}
                    </h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">
                        {t("empty_desc")}
                    </p>
                    <Button variant="outline" onClick={handleCreateHost}>
                        {t("add_first_host")}
                    </Button>
                </div>
            )}

            {!isLoading &&
                hostTree &&
                ((hosts?.length ?? 0) > 0 || (groups?.length ?? 0) > 0) && (
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    <div className="flex w-full flex-col gap-8">
                        {hostTree.roots.length > 0 && (
                            <HostGroupsList>
                                {hostTree.roots.map((node) => (
                                    <HostGroupSection
                                        key={node.group.id}
                                        node={node}
                                        onConnect={handleConnect}
                                        onSplitWithLocal={handleSplitWithLocal}
                                        onEditHost={handleEditHost}
                                        onDeleteHost={handleDeleteHostPrompt}
                                        onEditGroup={handleEditGroup}
                                        onDeleteGroup={handleDeleteGroupPrompt}
                                        renderHostCard={renderHostCard}
                                    />
                                ))}
                            </HostGroupsList>
                        )}

                        <UncategorizedHostSection
                            hosts={hostTree.uncategorized}
                            onConnect={handleConnect}
                            onSplitWithLocal={handleSplitWithLocal}
                            onEditHost={handleEditHost}
                            onDeleteHost={handleDeleteHostPrompt}
                            renderHostCard={renderHostCard}
                        />

                        {!hasAnyVisibleHosts &&
                            (searchQuery || tagFilter) && (
                            <p className="text-center text-sm text-muted-foreground">
                                {t("no_search_results")}
                            </p>
                        )}
                    </div>
                </DndContext>
            )}

            <HostModal
                isOpen={isHostModalOpen}
                onClose={() => setIsHostModalOpen(false)}
                onSave={handleSaveHost}
                initialData={editingHost}
                allHosts={allHosts ?? []}
                groups={groups ?? []}
                isSaving={saveHostMutation.isPending}
            />

            <HostGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onSave={handleSaveGroup}
                initialData={editingGroup}
                allGroups={groups ?? []}
                isSaving={saveGroupMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!hostToDelete}
                onClose={() => setHostToDelete(null)}
                onConfirm={handleConfirmDeleteHost}
                title={t("delete_title")}
                description={t("delete_desc", {
                    name: hostToDelete?.name || hostToDelete?.host,
                })}
                confirmText={t("delete", { ns: "common" })}
                isDestructive={true}
            />

            <HostKeyTrustModal
                check={hostKeyCheck}
                onTrust={() => void trustHostKey()}
                onCancel={cancelHostKey}
            />

            <ConfirmModal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                onConfirm={() => void handleConfirmDeleteGroup()}
                title={t("delete_group_title")}
                description={t("delete_group_desc", {
                    name: groupToDelete?.name,
                })}
                confirmText={t("delete", { ns: "common" })}
                isDestructive={true}
            />
        </div>
    );
}
