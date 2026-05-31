import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SnippetCard } from "@/components/views/SnippetCard";
import { SnippetModal } from "@/components/views/SnippetModal";
import { useSnippets, useSaveSnippet, useDeleteSnippet } from "@/hooks/useSnippets";
import { ResourceGrid, ResourceGridItem } from "@/components/views/ResourceGrid";
import { SavedSnippet } from "../../../bindings/terminator-desktop/backend/internal/services/blob/models";

export function SnippetsPage() {
    const { t } = useTranslation(["snippets", "common"]);
    const { data: snippets, isLoading } = useSnippets();
    const saveMutation = useSaveSnippet();
    const deleteMutation = useDeleteSnippet();

    const [searchQuery, setSearchQuery] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<SavedSnippet | null>(null);
    const [toDelete, setToDelete] = useState<SavedSnippet | null>(null);

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return snippets?.filter(
            (s) =>
                s.name.toLowerCase().includes(q) ||
                s.content.toLowerCase().includes(q),
        );
    }, [snippets, searchQuery]);

    const handleSave = (snippet: SavedSnippet) => {
        saveMutation.mutate(snippet, {
            onSuccess: () => {
                setIsModalOpen(false);
                setEditing(null);
            },
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
                <Button
                    onClick={() => {
                        setEditing(null);
                        setIsModalOpen(true);
                    }}
                >
                    <Plus className="mr-2 size-4" />
                    {t("add_snippet")}
                </Button>
            </div>

            <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
                {t("page_description")}
            </p>

            {isLoading && (
                <p className="text-muted-foreground">{t("loading", { ns: "common" })}</p>
            )}

            <ResourceGrid>
                {filtered?.map((snippet) => (
                    <ResourceGridItem key={snippet.id}>
                        <SnippetCard
                            snippet={snippet}
                            onEdit={(item) => {
                                setEditing(item);
                                setIsModalOpen(true);
                            }}
                            onDelete={setToDelete}
                        />
                    </ResourceGridItem>
                ))}
                {!isLoading && filtered?.length === 0 && (
                    <p className="col-span-full text-muted-foreground">{t("empty")}</p>
                )}
            </ResourceGrid>

            <SnippetModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditing(null);
                }}
                onSave={handleSave}
                initialData={editing}
                isSaving={saveMutation.isPending}
            />

            <ConfirmModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={() => {
                    if (toDelete) deleteMutation.mutate(toDelete.id);
                    setToDelete(null);
                }}
                title={t("delete_title")}
                description={t("delete_desc", { name: toDelete?.name })}
                confirmText={t("delete", { ns: "common" })}
                isDestructive
            />
        </div>
    );
}
