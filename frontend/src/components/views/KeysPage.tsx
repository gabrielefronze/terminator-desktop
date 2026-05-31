import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { FileUp, KeyRound, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchInput } from "@/components/ui/search-input";
import { KeyCard } from "@/components/views/KeyCard";
import { KeyModal } from "@/components/views/KeyModal";
import { GenerateKeyModal } from "@/components/views/GenerateKeyModal";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useKeys, useSaveKey, useDeleteKey } from "@/hooks/useKeys";
import { useHosts } from "@/hooks/useHosts";
import { SavedKey } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { getHostsForKey, isKeyUsedByHosts } from "@/lib/hostLinks";
import { handleAppError } from "@/lib/error";

export function KeysPage() {
    const {t} = useTranslation(["keys", "common"]);
    const { data: keys, isLoading } = useKeys();
    const { data: hosts } = useHosts();
    const saveMutation = useSaveKey();
    const deleteMutation = useDeleteKey();

    const [searchQuery, setSearchQuery] = useState("");
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [editingKey, setEditingKey] = useState<SavedKey | null>(null);
    const [keyToDelete, setKeyToDelete] = useState<SavedKey | null>(null);

    const handleImportKey = () => {
        setEditingKey(null);
        setIsEditModalOpen(true);
    };

    const handleGenerateKey = () => {
        setIsGenerateModalOpen(true);
    };

    const handleEdit = (key: SavedKey) => {
        setEditingKey(key);
        setIsEditModalOpen(true);
    };

    const handleDeletePrompt = (key: SavedKey) => {
        const inUse = hosts != null && isKeyUsedByHosts(hosts, key.id);
        if (inUse) {
            handleAppError(new Error(t("delete_in_use")));
            return;
        }
        setKeyToDelete(key);
    };

    const handleConfirmDelete = () => {
        if (keyToDelete) deleteMutation.mutate(keyToDelete.id);
        setKeyToDelete(null);
    };

    const handleSave = (key: SavedKey) => {
        saveMutation.mutate(key, {onSuccess: () => setIsEditModalOpen(false)});
    };

    const filteredKeys = useMemo(() => {
        const query = searchQuery.toLowerCase();
        return keys?.filter((k) => k.name.toLowerCase().includes(query));
    }, [keys, searchQuery]);

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-8">

            <div className="mb-8 flex w-full items-center gap-4">
                <h1 className="shrink-0 text-2xl font-bold tracking-tight text-foreground">
                    {t("page_title")}
                </h1>
                <SearchInput
                    placeholder={t("search_keys")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="shrink-0">
                            <Plus />
                            {t("new_key")}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleGenerateKey}>
                            <KeyRound className="size-4" />
                            {t("generate_key")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleImportKey}>
                            <FileUp className="size-4" />
                            {t("import_key")}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {isLoading && <div className="text-sm text-muted-foreground">{t("loading_keys")}</div>}

            {!isLoading && keys?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center
                                border-2 border-dashed border-border rounded-xl">
                    <h3 className="text-lg font-semibold text-foreground">{t("empty_title")}</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground">{t("empty_desc")}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button onClick={handleGenerateKey}>
                            <KeyRound className="size-4" />
                            {t("generate_key")}
                        </Button>
                        <Button variant="outline" onClick={handleImportKey}>
                            <FileUp className="size-4" />
                            {t("import_key")}
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(16rem,20rem))] gap-4">
                {filteredKeys?.map((key) => (
                    <KeyCard
                        key={key.id}
                        savedKey={key}
                        linkedHosts={getHostsForKey(hosts ?? [], key.id)}
                        onEdit={handleEdit}
                        onDelete={handleDeletePrompt}
                    />
                ))}
            </div>

            <KeyModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSave}
                initialData={editingKey}
                isSaving={saveMutation.isPending}
            />

            <GenerateKeyModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                onSave={(key) =>
                    saveMutation.mutate(key, {
                        onSuccess: () => setIsGenerateModalOpen(false),
                    })
                }
                isSaving={saveMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!keyToDelete}
                onClose={() => setKeyToDelete(null)}
                onConfirm={handleConfirmDelete}
                title={t("delete_title")}
                description={t("delete_desc", {name: keyToDelete?.name})}
                confirmText={t("delete", {ns: "common"})}
                isDestructive={true}
            />
        </div>
    );
}