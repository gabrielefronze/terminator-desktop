import { useTranslation } from "react-i18next";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { usePlatform } from "@/hooks/usePlatform";
import {
    KEYBOARD_SHORTCUT_CATEGORIES,
    shortcutDisplayLabel,
} from "@/lib/keyboardShortcuts";
import { useUIStore } from "@/store/uiStore";

export function ShortcutsOverlay() {
    const { t } = useTranslation("shortcuts");
    const { isMac } = usePlatform();
    const isOpen = useUIStore((s) => s.isShortcutsOverlayOpen);
    const closeShortcutsOverlay = useUIStore((s) => s.closeShortcutsOverlay);

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => !open && closeShortcutsOverlay()}
        >
            <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-6">
                    {KEYBOARD_SHORTCUT_CATEGORIES.map((category) => (
                        <section key={category.categoryKey}>
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {t(`categories.${category.categoryKey}`)}
                            </h3>
                            <dl className="divide-y divide-border rounded-lg border border-border">
                                {category.items.map((item) => (
                                    <div
                                        key={item.actionKey}
                                        className="flex items-center justify-between gap-4 px-3 py-2 text-sm"
                                    >
                                        <dt className="text-foreground">
                                            {t(`actions.${item.actionKey}`)}
                                        </dt>
                                        <dd className="shrink-0 font-mono text-xs text-muted-foreground">
                                            {shortcutDisplayLabel(item, isMac)}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </section>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
