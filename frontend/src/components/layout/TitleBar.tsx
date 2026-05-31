import { useMemo, useState } from "react";
import { TabGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { useSessionStore, type TerminalSession } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { WindowControls } from "@/components/layout/WindowControls";
import {
    defaultTabGroupFromTileSessions,
    serializeTabGroupFromSessions,
    type SavedTileNode,
} from "@/lib/tabGroupLayout";
import {
    getSplitExtraCount,
    getSplitPartner,
    getTileGroupSessionIds,
    getTitleBarSessions,
    isSplitGroupActive,
} from "@/lib/sessionTabs";
import {
    tabGroupById,
} from "@/lib/tabGroups";
import { TerminalTab } from "@/components/layout/TerminalTab";
import { useTabDrag } from "@/components/layout/TabDragProvider";
import { TabGroupModal } from "@/components/views/TabGroupModal";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore.ts";
import { MAC_TITLE_BAR_HEIGHT_PX } from "@/lib/platform";
import { usePlatform } from "@/hooks/usePlatform";
import { Window } from "@wailsio/runtime";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import React, { useRef } from "react";
import { useAllHosts } from "@/hooks/useHosts";
import { useTabGroups, useSaveTabGroup } from "@/hooks/useTabGroups";
import { TitleBarActions } from "@/components/layout/TitleBarActions";

function handleTitleBarDoubleClick(e: React.MouseEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (target.closest(".wails-no-drag") || target.closest("button")) {
        return;
    }
    void Window.ToggleMaximise();
}

type TabGroupModalState = {
    initialData: Partial<TabGroup>;
    sessionIds: string[];
    hostIds: string[];
    tileLayout?: SavedTileNode;
};

export function TitleBar() {
    const { t } = useTranslation("terminal");
    const {
        sessions,
        activeSessionId,
        setActiveSession,
        removeSession,
        closeTileGroup,
        assignTabGroupId,
    } = useSessionStore();
    const { activeView, openNewTabHostPicker } = useUIStore();
    const { isMac } = usePlatform();
    const allHosts = useAllHosts();
    const { data: tabGroups } = useTabGroups();
    const saveTabGroup = useSaveTabGroup();
    const { suppressClickUntil } = useTabDrag();

    const isTerminalView = activeView === ViewType.Terminal;
    const { isUnlocked } = useAuthStore();
    const newTabShortcut = isMac ? "⌘T" : "Ctrl+T";

    const scrollRef = useRef<HTMLDivElement>(null);
    const [tabGroupModal, setTabGroupModal] =
        useState<TabGroupModalState | null>(null);

    const groupsById = useMemo(
        () => tabGroupById(tabGroups),
        [tabGroups],
    );

    const titleBarSessions = getTitleBarSessions(sessions);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (scrollRef.current && e.deltaY !== 0) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    const closeOthers = (sessionId: string) => {
        const leader = sessions.find((session) => session.id === sessionId);
        const keepIds = new Set(
            leader ? getTileGroupSessionIds(leader, sessions) : [sessionId],
        );

        sessions
            .filter((session) => !keepIds.has(session.id))
            .forEach((session) => removeSession(session.id));
    };

    const closeAll = () => {
        sessions.forEach((session) => removeSession(session.id));
    };

    const handleTabClick = (sessionId: string) => {
        if (suppressClickUntil()) return;
        setActiveSession(sessionId);
    };

    const openTabGroupModal = (session: TerminalSession) => {
        const sessionIds = getTileGroupSessionIds(session, sessions);
        if (sessionIds.length < 2) return;

        const existingGroup = session.tabGroupId
            ? groupsById.get(session.tabGroupId)
            : undefined;

        const serialized = serializeTabGroupFromSessions(session, sessions);

        setTabGroupModal({
            initialData: {
                ...(existingGroup ??
                    defaultTabGroupFromTileSessions(session, sessions)),
                hostIds: serialized.hostIds,
                tileLayout: serialized.tileLayout as TabGroup["tileLayout"],
            },
            sessionIds,
            hostIds: serialized.hostIds,
            tileLayout: serialized.tileLayout,
        });
    };

    const handleSaveTabGroup = (group: TabGroup) => {
        if (!tabGroupModal) return;

        saveTabGroup.mutate(group, {
            onSuccess: (id) => {
                assignTabGroupId(tabGroupModal.sessionIds, id);
                setTabGroupModal(null);
            },
        });
    };

    return (
        <>
            <header
                onDoubleClick={handleTitleBarDoubleClick}
                className={cn(
                    "wails-drag flex shrink-0 items-center bg-transparent",
                    isMac ? "h-9" : "h-8 pr-0",
                )}
                style={
                    isMac
                        ? { height: `${MAC_TITLE_BAR_HEIGHT_PX}px` }
                        : undefined
                }
            >
                {isMac && <WindowControls className="shrink-0" />}

                <div
                    ref={scrollRef}
                    onWheel={handleWheel}
                    className="flex h-full min-w-0 flex-1 items-center gap-1 overflow-x-auto overflow-y-hidden px-2 [&::-webkit-scrollbar]:hidden"
                >
                    {isUnlocked &&
                        titleBarSessions.map((session) => {
                            const partner = getSplitPartner(
                                session,
                                sessions,
                            );
                            const splitExtraCount = getSplitExtraCount(
                                session,
                                sessions,
                            );
                            const tabGroup = session.tabGroupId
                                ? groupsById.get(session.tabGroupId)
                                : undefined;
                            const isSavedGroup = Boolean(tabGroup);

                            return (
                                <TerminalTab
                                    key={session.id}
                                    session={session}
                                    displayTitle={
                                        tabGroup?.name ?? session.title
                                    }
                                    displayIcon={
                                        tabGroup?.icon ?? session.icon
                                    }
                                    displayColor={
                                        tabGroup?.color ?? session.color
                                    }
                                    isTabGroup={isSavedGroup}
                                    splitExtraCount={
                                        isSavedGroup ? 0 : splitExtraCount
                                    }
                                    splitPartnerTitle={partner?.title}
                                    isActive={isSplitGroupActive(
                                        session,
                                        isTerminalView
                                            ? activeSessionId
                                            : null,
                                        sessions,
                                    )}
                                    onClick={() =>
                                        handleTabClick(session.id)
                                    }
                                    onClose={() => {
                                        const paneCount =
                                            getTileGroupSessionIds(
                                                session,
                                                sessions,
                                            ).length;
                                        if (paneCount > 1) {
                                            closeTileGroup(session.id);
                                            return;
                                        }
                                        removeSession(session.id);
                                    }}
                                    onCloseOthers={() =>
                                        closeOthers(session.id)
                                    }
                                    onCloseAll={closeAll}
                                    onSaveTabGroup={
                                        splitExtraCount > 0 &&
                                        !isSavedGroup
                                            ? () =>
                                                  openTabGroupModal(session)
                                            : undefined
                                    }
                                    onRenameTabGroup={
                                        isSavedGroup
                                            ? () =>
                                                  openTabGroupModal(session)
                                            : undefined
                                    }
                                />
                            );
                        })}
                    {isUnlocked && (
                        <button
                            type="button"
                            title={t("new_tab_button_shortcut", {
                                shortcut: newTabShortcut,
                            })}
                            aria-label={t("new_tab_button_shortcut", {
                                shortcut: newTabShortcut,
                            })}
                            className="wails-no-drag flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            onClick={openNewTabHostPicker}
                        >
                            <Plus className="size-3.5" />
                        </button>
                    )}
                </div>

                {isUnlocked && isTerminalView && <TitleBarActions />}

                {!isMac && <WindowControls className="ml-2 shrink-0" />}
            </header>

            <TabGroupModal
                isOpen={tabGroupModal != null}
                onClose={() => setTabGroupModal(null)}
                onSave={handleSaveTabGroup}
                initialData={tabGroupModal?.initialData}
                hostIds={tabGroupModal?.hostIds ?? []}
                tileLayout={tabGroupModal?.tileLayout}
                allHosts={allHosts}
                isSaving={saveTabGroup.isPending}
            />
        </>
    );
}
