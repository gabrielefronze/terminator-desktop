import { Copy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PublicKeyDisplayProps {
    publicKey?: string;
    unavailableMessage?: string;
    compact?: boolean;
    className?: string;
}

export function PublicKeyDisplay({
    publicKey,
    unavailableMessage,
    compact = false,
    className,
}: PublicKeyDisplayProps) {
    const { t } = useTranslation("keys");

    const handleCopy = async () => {
        if (!publicKey) return;
        try {
            await navigator.clipboard.writeText(publicKey);
            toast.success(t("generate_public_key_copied"));
        } catch {
            toast.error(t("generate_public_key_copy_failed"));
        }
    };

    return (
        <div className={cn("grid gap-2", className)}>
            <div className="flex items-center justify-between gap-2">
                <Label className="text-xs text-muted-foreground">
                    {t("public_key_label")}
                </Label>
                {publicKey ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => void handleCopy()}
                    >
                        <Copy className="mr-1.5 size-3" />
                        {t("generate_copy_public_key")}
                    </Button>
                ) : null}
            </div>
            {publicKey ? (
                <p
                    className={cn(
                        "break-all rounded-md border border-border/60 bg-muted/20 font-mono text-muted-foreground",
                        compact
                            ? "max-h-16 overflow-y-auto p-2 text-2xs leading-relaxed"
                            : "p-2.5 text-xs leading-relaxed",
                    )}
                >
                    {publicKey}
                </p>
            ) : (
                <p className="text-xs text-muted-foreground">
                    {unavailableMessage ?? t("public_key_unavailable")}
                </p>
            )}
        </div>
    );
}
