import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SnippetModal } from "@/components/views/SnippetModal";
import { useSnippets, useSaveSnippet, useDeleteSnippet } from "@/hooks/useSnippets";
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
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder={t("search_placeholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
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

            <div className="grid gap-3">
                {filtered?.map((snippet) => (
                    <div
                        key={snippet.id}
                        className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4"
                    >
                        <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => {
                                setEditing(snippet);
                                setIsModalOpen(true);
                            }}
                        >
                            <div className="font-medium">{snippet.name}</div>
                            <pre className="mt-1 truncate font-mono text-xs text-muted-foreground">
                                {snippet.content}
                            </pre>
                        </button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setToDelete(snippet)}
                        >
                            <Trash2 className="size-4" />
                        </Button>
                    </div>
                ))}
                {!isLoading && filtered?.length === 0 && (
                    <p className="text-muted-foreground">{t("empty")}</p>
                )}
            </div>

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
