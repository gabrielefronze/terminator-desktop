import { useEffect, useState, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    GenerateSSHKeyRequest,
    ItemType,
    KeyService,
    SavedKey,
} from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { handleAppError } from "@/lib/error";

const ALGORITHMS = ["ed25519", "rsa4096", "rsa2048"] as const;

interface GenerateKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (key: SavedKey) => void;
    isSaving: boolean;
}

export function GenerateKeyModal({
    isOpen,
    onClose,
    onSave,
    isSaving,
}: GenerateKeyModalProps) {
    const { t } = useTranslation(["keys", "common"]);
    const [name, setName] = useState("");
    const [algorithm, setAlgorithm] =
        useState<(typeof ALGORITHMS)[number]>("ed25519");
    const [comment, setComment] = useState("");
    const [privateKey, setPrivateKey] = useState("");
    const [publicKey, setPublicKey] = useState("");
    const [fingerprint, setFingerprint] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setName("");
        setAlgorithm("ed25519");
        setComment("");
        setPrivateKey("");
        setPublicKey("");
        setFingerprint("");
        setIsGenerating(false);
    }, [isOpen]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            const generated = await KeyService.GenerateKeyPair(
                new GenerateSSHKeyRequest({
                    algorithm,
                    comment: comment.trim() || name.trim() || undefined,
                }),
            );
            setPrivateKey(generated.privateKey);
            setPublicKey(generated.publicKey);
            setFingerprint(generated.fingerprint);
            if (!name.trim()) {
                setName(
                    t("generate_default_name", {
                        algorithm: t(`generate_algorithm_${generated.algorithm}`),
                    }),
                );
            }
        } catch (error) {
            handleAppError(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCopyPublicKey = async () => {
        if (!publicKey) return;
        try {
            await navigator.clipboard.writeText(publicKey);
            toast.success(t("generate_public_key_copied"));
        } catch {
            toast.error(t("generate_public_key_copy_failed"));
        }
    };

    const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!privateKey || !name.trim()) return;
        onSave(
            new SavedKey({
                id: "",
                type: ItemType.TypeKey,
                name: name.trim(),
                privateKey,
                publicKey,
            }),
        );
    };

    const hasGeneratedKey = Boolean(privateKey && publicKey);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{t("generate_title")}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="generate-key-name">
                            {t("key_name_label")}
                        </Label>
                        <Input
                            id="generate-key-name"
                            placeholder={t("key_name_placeholder")}
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="generate-algorithm">
                            {t("generate_algorithm_label")}
                        </Label>
                        <Select
                            value={algorithm}
                            onValueChange={(value) =>
                                setAlgorithm(value as (typeof ALGORITHMS)[number])
                            }
                            disabled={hasGeneratedKey || isGenerating}
                        >
                            <SelectTrigger id="generate-algorithm" className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ALGORITHMS.map((value) => (
                                    <SelectItem key={value} value={value}>
                                        {t(`generate_algorithm_${value}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            {t(`generate_algorithm_hint_${algorithm}`)}
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="generate-comment">
                            {t("generate_comment_label")}
                        </Label>
                        <Input
                            id="generate-comment"
                            placeholder={t("generate_comment_placeholder")}
                            value={comment}
                            disabled={hasGeneratedKey || isGenerating}
                            onChange={(e) => setComment(e.target.value)}
                        />
                    </div>

                    {!hasGeneratedKey ? (
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full"
                            disabled={isGenerating}
                            onClick={() => void handleGenerate()}
                        >
                            {isGenerating ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                                <KeyRound className="mr-2 size-4" />
                            )}
                            {isGenerating
                                ? t("generate_in_progress")
                                : t("generate_btn")}
                        </Button>
                    ) : (
                        <>
                            <div className="grid gap-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="generate-public-key">
                                        {t("generate_public_key_label")}
                                    </Label>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs"
                                        onClick={() => void handleCopyPublicKey()}
                                    >
                                        <Copy className="mr-1.5 size-3" />
                                        {t("generate_copy_public_key")}
                                    </Button>
                                </div>
                                <Textarea
                                    id="generate-public-key"
                                    readOnly
                                    className="min-h-20 font-mono text-xs"
                                    value={publicKey}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t("generate_fingerprint_label")}:{" "}
                                    <span className="font-mono">{fingerprint}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {t("generate_public_key_hint")}
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="justify-start px-0 text-muted-foreground"
                                disabled={isGenerating}
                                onClick={() => void handleGenerate()}
                            >
                                {t("generate_regenerate_btn")}
                            </Button>
                        </>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSaving || isGenerating}
                        >
                            {t("cancel", { ns: "common" })}
                        </Button>
                        <Button
                            type="submit"
                            disabled={
                                isSaving || isGenerating || !hasGeneratedKey
                            }
                        >
                            {isSaving
                                ? t("saving", { ns: "common" })
                                : t("save_key")}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
