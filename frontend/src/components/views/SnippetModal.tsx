import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SavedSnippet, ItemType } from "../../../bindings/terminator-desktop/backend/internal/services/blob/models";

interface SnippetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (snippet: SavedSnippet) => void;
    initialData?: SavedSnippet | null;
    isSaving?: boolean;
}

export function SnippetModal({
    isOpen,
    onClose,
    onSave,
    initialData,
    isSaving,
}: SnippetModalProps) {
    const { t } = useTranslation(["snippets", "terminal"]);
    const [name, setName] = useState("");
    const [content, setContent] = useState("");

    useEffect(() => {
        setName(initialData?.name ?? "");
        setContent(initialData?.content ?? "");
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(
            new SavedSnippet({
                id: initialData?.id ?? "",
                type: ItemType.TypeSnippet,
                name: name.trim(),
                content,
            }),
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>
                            {initialData?.id
                                ? t("snippet_edit", { ns: "terminal" })
                                : t("add_snippet")}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="snippet-name">
                                {t("snippet_name", { ns: "terminal" })}
                            </Label>
                            <Input
                                id="snippet-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="snippet-content">
                                {t("snippet_content", { ns: "terminal" })}
                            </Label>
                            <textarea
                                id="snippet-content"
                                className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            {t("host_key_cancel")}
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {t("save", { ns: "common" })}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
