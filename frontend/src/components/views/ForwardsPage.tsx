import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { ForwardCard } from "@/components/views/ForwardCard";
import { ForwardModal } from "@/components/views/ForwardModal";
import { HostKeyTrustModal } from "@/components/terminal/HostKeyTrustModal";
import { useActivePortForwards } from "@/hooks/useActivePortForwards";
import {
    useDeleteForward,
    useForwards,
    useSaveForward,
} from "@/hooks/useForwards";
import { useHosts } from "@/hooks/useHosts";
import { useHostsWithoutBuiltin } from "@/hooks/useResolvedLocalhostHost";
import { useKeys } from "@/hooks/useKeys";
import { useIdentities } from "@/hooks/useIdentities";
import { useStartSavedForward } from "@/hooks/useStartSavedForward";
import { SavedForward } from "../../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { useSessionStore } from "@/store/sessionStore";
import { formatForwardRoute } from "@/lib/savedForwardRuntime";

export function ForwardsPage() {
    const { t } = useTranslation(["forwards", "common"]);
    const { data: forwards, isLoading } = useForwards();
    const { data: allHosts } = useHosts();
    const { data: remoteHosts } = useHostsWithoutBuiltin();
    const { data: keys } = useKeys();
    const { data: identities } = useIdentities();
    const saveMutation = useSaveForward();
    const deleteMutation = useDeleteForward();
    const sessions = useSessionStore((state) => state.sessions);

    const {
        startForward,
        stopForward,
        startingId,
        stoppingId,
        hostKeyCheck,
        trustHostKey,
        cancelHostKey,
    } = useStartSavedForward(remoteHosts, keys, identities, allHosts);

    const remoteSessionIds = useMemo(
        () =>
            sessions
                .filter((session) => !session.config.local)
                .map((session) => session.id),
        [sessions],
    );
    const activeForwards = useActivePortForwards(remoteSessionIds);

    const hostsById = useMemo(() => {
        const map = new Map<string, NonNullable<typeof allHosts>[number]>();
        for (const host of allHosts ?? []) {
            map.set(host.id, host);
        }
        return map;
    }, [allHosts]);

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<SavedForward | null>(null);
    const [toDelete, setToDelete] = useState<SavedForward | null>(null);

    const filtered = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return forwards?.filter((forward) => {
            const host = hostsById.get(forward.hostId);
            const hostLabel = host?.name || host?.host || "";
            return (
                forward.name.toLowerCase().includes(query) ||
                hostLabel.toLowerCase().includes(query) ||
                formatForwardRoute(forward).toLowerCase().includes(query)
            );
        });
    }, [forwards, hostsById, searchQuery]);

    const handleSave = (forward: SavedForward) => {
        saveMutation.mutate(forward, {
            onSuccess: () => {
                setIsModalOpen(false);
                setEditing(null);
            },
        });
    };

    const handleConfirmDelete = () => {
        if (!toDelete) {
            return;
        }
        if (activeForwards.has(toDelete.id)) {
            void stopForward(toDelete.id);
        }
        deleteMutation.mutate(toDelete.id);
        setToDelete(null);
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
                <Button
                    className="shrink-0"
                    onClick={() => {
                        setEditing(null);
                        setIsModalOpen(true);
                    }}
                >
                    <Plus className="mr-2 size-4" />
                    {t("create_forward")}
                </Button>
            </div>

            <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
                {t("page_description")}
            </p>

            {isLoading && (
                <p className="text-muted-foreground">
                    {t("loading", { ns: "common" })}
                </p>
            )}

            <div className="grid gap-3">
                {filtered?.map((forward) => (
                    <ForwardCard
                        key={forward.id}
                        forward={forward}
                        host={hostsById.get(forward.hostId)}
                        isRunning={activeForwards.has(forward.id)}
                        isStarting={startingId === forward.id}
                        isStopping={stoppingId === forward.id}
                        onStart={startForward}
                        onStop={stopForward}
                        onEdit={(item) => {
                            setEditing(item);
                            setIsModalOpen(true);
                        }}
                        onDelete={setToDelete}
                    />
                ))}
                {!isLoading && filtered?.length === 0 && (
                    <p className="text-muted-foreground">{t("empty")}</p>
                )}
            </div>

            <ForwardModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditing(null);
                }}
                onSave={handleSave}
                initialData={editing}
                hosts={allHosts ?? []}
                isSaving={saveMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t("delete_title")}
                description={t("delete_desc", { name: toDelete?.name })}
                confirmText={t("delete", { ns: "common" })}
                isDestructive
            />

            <HostKeyTrustModal
                check={hostKeyCheck}
                onTrust={() => void trustHostKey()}
                onCancel={cancelHostKey}
            />
        </div>
    );
}
