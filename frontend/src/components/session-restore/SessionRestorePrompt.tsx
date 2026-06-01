import { useTranslation } from "react-i18next";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionRestorePromptProps {
    open: boolean;
    tabCount: number;
    restoring: boolean;
    onRestore: () => void;
    onDismiss: () => void;
}

export function SessionRestorePrompt({
    open,
    tabCount,
    restoring,
    onRestore,
    onDismiss,
}: SessionRestorePromptProps) {
    const { t } = useTranslation(["sessionRestore", "common"]);

    return (
        <AlertDialog open={open} onOpenChange={(next) => !next && onDismiss()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("description", { count: tabCount })}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={restoring} onClick={onDismiss}>
                        {t("start_fresh")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={restoring || tabCount === 0}
                        onClick={(event) => {
                            event.preventDefault();
                            onRestore();
                        }}
                    >
                        {restoring ? t("restoring") : t("restore")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
