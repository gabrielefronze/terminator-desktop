import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IdentityCard } from "@/components/views/IdentityCard";
import { IdentityModal } from "@/components/views/IdentityModal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
    useIdentities,
    useSaveIdentity,
    useDeleteIdentity,
} from "@/hooks/useIdentities";
import { useHosts } from "@/hooks/useHosts";
import { SavedIdentity } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { handleAppError } from "@/lib/error";
import {
    getHostsForIdentity,
    isIdentityUsedByHosts,
} from "@/lib/hostLinks";

export function IdentitiesPage() {
    const { t } = useTranslation(["identities", "common"]);
    const { data: identities, isLoading } = useIdentities();
    const { data: hosts } = useHosts();
    const saveMutation = useSaveIdentity();
    const deleteMutation = useDeleteIdentity();

    const [searchQuery, setSearchQuery] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingIdentity, setEditingIdentity] = useState<SavedIdentity | null>(
        null,
    );
    const [identityToDelete, setIdentityToDelete] =
        useState<SavedIdentity | null>(null);

    const handleCreateNew = () => {
        setEditingIdentity(null);
        setIsEditModalOpen(true);
    };

    const handleEdit = (identity: SavedIdentity) => {
        setEditingIdentity(identity);
        setIsEditModalOpen(true);
    };

    const handleDeletePrompt = (identity: SavedIdentity) => {
        const inUse =
            hosts != null && isIdentityUsedByHosts(hosts, identity.id);
        if (inUse) {
            handleAppError(new Error(t("delete_in_use")));
            return;
        }
        setIdentityToDelete(identity);
    };

    const handleConfirmDelete = () => {
        if (identityToDelete) deleteMutation.mutate(identityToDelete.id);
        setIdentityToDelete(null);
    };

    const handleSave = (identity: SavedIdentity) => {
        saveMutation.mutate(identity, {
            onSuccess: () => setIsEditModalOpen(false),
        });
    };

    const filteredIdentities = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return identities?.filter(
            (i) =>
                i.name.toLowerCase().includes(query) ||
                i.username.toLowerCase().includes(query),
        );
    }, [identities, searchQuery]);

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-8">
            <div className="mb-8 flex w-full items-center gap-4">
                <h1 className="shrink-0 text-2xl font-bold tracking-tight text-foreground">
                    {t("page_title")}
                </h1>
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t("search_identities")}
                        className="w-full border-border bg-input/50 pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button onClick={handleCreateNew} className="shrink-0">
                    <Plus />
                    {t("new_identity")}
                </Button>
            </div>

            {isLoading && (
                <div className="text-sm text-muted-foreground">
                    {t("loading_identities")}
                </div>
            )}

            {!isLoading && identities?.length === 0 && (
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
                    <Button variant="outline" onClick={handleCreateNew}>
                        {t("add_first_identity")}
                    </Button>
                </div>
            )}

            <div
                className="grid w-full gap-4"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))" }}
            >
                {filteredIdentities?.map((identity) => (
                    <IdentityCard
                        key={identity.id}
                        identity={identity}
                        linkedHosts={getHostsForIdentity(hosts ?? [], identity.id)}
                        onEdit={handleEdit}
                        onDelete={handleDeletePrompt}
                    />
                ))}
            </div>

            <IdentityModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSave}
                initialData={editingIdentity}
                isSaving={saveMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!identityToDelete}
                onClose={() => setIdentityToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t("delete_title")}
                description={t("delete_desc", {
                    name: identityToDelete?.name,
                })}
                confirmText={t("delete", { ns: "common" })}
                isDestructive={true}
            />
        </div>
    );
}
