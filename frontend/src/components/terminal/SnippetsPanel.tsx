import { useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useSnippets, useSaveSnippet } from "@/hooks/useSnippets";
import { SnippetModal } from "@/components/views/SnippetModal";
import { SavedSnippet } from "../../../bindings/terminator-desktop/backend/internal/services/blob/models";
import { SshService } from "../../../bindings/terminator-desktop/backend/internal/services/ssh";
import { parseAppError } from "@/lib/error";
import { toast } from "sonner";

interface SnippetsPanelProps {
    sessionId: string;
    disabled?: boolean;
}

export function SnippetsPanel({ sessionId, disabled }: SnippetsPanelProps) {
    const { t } = useTranslation("terminal");
    const { data: snippets } = useSnippets();
    const saveSnippet = useSaveSnippet();
    const [modalOpen, setModalOpen] = useState(false);

    const runSnippet = async (content: string) => {
        if (disabled) return;
        const payload = content.endsWith("\n") ? content : `${content}\n`;
        try {
            await SshService.Input(sessionId, payload);
        } catch (error) {
            const appError = parseAppError(error);
            toast.error(appError.message);
        }
    };

    const handleSave = (snippet: SavedSnippet) => {
        saveSnippet.mutate(snippet, {
            onSuccess: () => setModalOpen(false),
        });
    };

    return (
        <div className="flex h-full flex-col border-l border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-2 py-2">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("snippets_title")}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setModalOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <SnippetModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSave}
                isSaving={saveSnippet.isPending}
            />
            <div className="flex-1 overflow-y-auto p-2">
                {!snippets?.length && (
                    <p className="px-2 py-4 text-xs text-muted-foreground">
                        {t("snippets_empty")}
                    </p>
                )}
                <div className="flex flex-col gap-1">
                    {snippets?.map((snippet) => (
                        <Button
                            key={snippet.id}
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto justify-start whitespace-normal py-2 text-left"
                            disabled={disabled}
                            onClick={() => void runSnippet(snippet.content)}
                        >
                            <span className="font-medium">{snippet.name}</span>
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
