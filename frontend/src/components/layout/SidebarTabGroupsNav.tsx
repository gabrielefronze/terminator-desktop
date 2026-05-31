import { useTranslation } from "react-i18next";
import { Columns2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sidebarNavButtonClass } from "@/lib/sidebarNav";
import { useUIStore, ViewType } from "@/store/uiStore";

export function SidebarTabGroupsNav() {
    const { t } = useTranslation("tabgroups");
    const { activeView, setActiveView } = useUIStore();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveView(ViewType.TabGroups)}
            className={sidebarNavButtonClass(activeView === ViewType.TabGroups)}
            title={t("page_title")}
            aria-label={t("page_title")}
        >
            <Columns2 className="size-5" />
        </Button>
    );
}
