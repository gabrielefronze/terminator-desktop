import { useMemo, useState } from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { TabGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { useSessionStore, type TerminalSession } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { WindowControls } from "@/components/layout/WindowControls";
import {
    getSplitExtraCount,
    getSplitPartner,
    getTitleBarSessions,
    isSplitGroupActive,
} from "@/lib/sessionTabs";
import {
    defaultTabGroupFromSplit,
    collectHostIdsFromSplit,
    tabGroupById,
} from "@/lib/tabGroups";
import { TerminalTab } from "@/components/layout/TerminalTab";
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
};

export function TitleBar() {
    const { t } = useTranslation("terminal");
    const {
        sessions,
        activeSessionId,
        setActiveSession,
        removeSession,
        linkSplitSessions,
        assignTabGroupId,
    } = useSessionStore();
    const { activeView, openNewTabHostPicker } = useUIStore();
    const { isMac } = usePlatform();
    const allHosts = useAllHosts();
    const { data: tabGroups } = useTabGroups();
    const saveTabGroup = useSaveTabGroup();

    const isTerminalView = activeView === ViewType.Terminal;
    const { isUnlocked } = useAuthStore();
    const newTabShortcut = isMac ? "⌘T" : "Ctrl+T";

    const scrollRef = useRef<HTMLDivElement>(null);
    const suppressClickUntilRef = useRef(0);
    const [draggingSessionId, setDraggingSessionId] = useState<string | null>(
        null,
    );
    const [tabGroupModal, setTabGroupModal] =
        useState<TabGroupModalState | null>(null);

    const draggingSession = draggingSessionId
        ? sessions.find((session) => session.id === draggingSessionId)
        : undefined;

    const groupsById = useMemo(
        () => tabGroupById(tabGroups),
        [tabGroups],
    );

    const titleBarSessions = getTitleBarSessions(sessions);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (scrollRef.current && e.deltaY !== 0) {
            scrollRef.current.scrollLeft += e.deltaY;
        }
    };

    const closeOthers = (sessionId: string) => {
        const leader = sessions.find((session) => session.id === sessionId);
        const keepIds = new Set([sessionId]);
        if (leader?.splitPartnerId) {
            keepIds.add(leader.splitPartnerId);
        }

        sessions
            .filter((session) => !keepIds.has(session.id))
            .forEach((session) => removeSession(session.id));
    };

    const closeAll = () => {
        sessions.forEach((session) => removeSession(session.id));
    };

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.type !== "tab") return;
        setDraggingSessionId(data.sessionId as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setDraggingSessionId(null);
        suppressClickUntilRef.current = Date.now() + 300;

        const { active, over } = event;
        if (!over) return;

        const activeData = active.data.current;
        const overData = over.data.current;
        if (activeData?.type !== "tab" || overData?.type !== "tab-drop") {
            return;
        }

        const sourceId = activeData.sessionId as string;
        const targetId = overData.sessionId as string;
        linkSplitSessions(sourceId, targetId);
    };

    const handleTabClick = (sessionId: string) => {
        if (Date.now() < suppressClickUntilRef.current) return;
        setActiveSession(sessionId);
    };

    const handleDragCancel = () => {
        setDraggingSessionId(null);
    };

    const openTabGroupModal = (session: TerminalSession) => {
        const partner = getSplitPartner(session, sessions);
        if (!partner) return;

        const existingGroup = session.tabGroupId
            ? groupsById.get(session.tabGroupId)
            : undefined;

        const hostIds = collectHostIdsFromSplit(session, partner);

        setTabGroupModal({
            initialData: {
                ...(existingGroup ?? defaultTabGroupFromSplit(session, partner)),
                hostIds,
            },
            sessionIds: [session.id, partner.id],
            hostIds,
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

                <DndContext
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={handleDragCancel}
                >
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
                                        )}
                                        onClick={() =>
                                            handleTabClick(session.id)
                                        }
                                        onClose={() =>
                                            removeSession(session.id)
                                        }
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

                    <DragOverlay dropAnimation={null}>
                        {draggingSession ? (() => {
                            const dragTabGroup = draggingSession.tabGroupId
                                ? groupsById.get(draggingSession.tabGroupId)
                                : undefined;

                            return (
                                <TerminalTab
                                    session={draggingSession}
                                    displayTitle={
                                        dragTabGroup?.name ??
                                        draggingSession.title
                                    }
                                    displayIcon={
                                        dragTabGroup?.icon ??
                                        draggingSession.icon
                                    }
                                    displayColor={
                                        dragTabGroup?.color ??
                                        draggingSession.color
                                    }
                                    isTabGroup={Boolean(dragTabGroup)}
                                    isActive={
                                        isTerminalView &&
                                        draggingSession.id === activeSessionId
                                    }
                                    onClick={() => {}}
                                    onClose={() => {}}
                                    onCloseOthers={() => {}}
                                    onCloseAll={() => {}}
                                    enableDragDrop={false}
                                    isDragOverlay
                                />
                            );
                        })() : null}
                    </DragOverlay>
                </DndContext>

                {!isMac && <WindowControls className="ml-2 shrink-0" />}
            </header>

            <TabGroupModal
                isOpen={tabGroupModal != null}
                onClose={() => setTabGroupModal(null)}
                onSave={handleSaveTabGroup}
                initialData={tabGroupModal?.initialData}
                hostIds={tabGroupModal?.hostIds ?? []}
                allHosts={allHosts}
                isSaving={saveTabGroup.isPending}
            />
        </>
    );
}
