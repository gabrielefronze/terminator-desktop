import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useDndMonitor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { TabGroup } from "../../../bindings/terminator-desktop/backend/internal/services/blob";
import { useSessionStore, type TerminalSession } from "@/store/sessionStore";
import { useUIStore, ViewType } from "@/store/uiStore";
import { TerminalTab } from "@/components/layout/TerminalTab";
import { resolveDropZone } from "@/lib/tileDrop";
import type { TileDropZone } from "@/lib/tileLayout";
import { isSplitGroupActive } from "@/lib/sessionTabs";
import { tabGroupById } from "@/lib/tabGroups";
import { useTabGroups } from "@/hooks/useTabGroups";

export type PaneDropTarget = {
    sessionId: string;
    zone: TileDropZone;
};

type TabDragContextValue = {
    draggingSessionId: string | null;
    paneDropTarget: PaneDropTarget | null;
    suppressClickUntil: () => boolean;
    registerSuppressClick: () => void;
};

const TabDragContext = createContext<TabDragContextValue | null>(null);

export function useTabDrag() {
    const context = useContext(TabDragContext);
    if (!context) {
        throw new Error("useTabDrag must be used within TabDragProvider");
    }
    return context;
}

function PaneDropMonitor({
    onPaneDropTargetChange,
    pointerRef,
}: {
    onPaneDropTargetChange: (target: PaneDropTarget | null) => void;
    pointerRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
    useDndMonitor({
        onDragMove({ over }) {
            const overData = over?.data.current;
            if (overData?.type !== "pane-drop" || !over?.rect) {
                onPaneDropTargetChange(null);
                return;
            }

            const zone = resolveDropZone(
                over.rect,
                pointerRef.current.x,
                pointerRef.current.y,
            );

            onPaneDropTargetChange({
                sessionId: overData.sessionId as string,
                zone,
            });
        },
        onDragEnd() {
            onPaneDropTargetChange(null);
        },
        onDragCancel() {
            onPaneDropTargetChange(null);
        },
    });

    return null;
}

interface TabDragProviderProps {
    children: ReactNode;
}

export function TabDragProvider({ children }: TabDragProviderProps) {
    const { sessions, activeSessionId, addSessionToTile } = useSessionStore();
    const activeView = useUIStore((state) => state.activeView);
    const { data: tabGroups } = useTabGroups();

    const [draggingSessionId, setDraggingSessionId] = useState<string | null>(
        null,
    );
    const [paneDropTarget, setPaneDropTarget] =
        useState<PaneDropTarget | null>(null);
    const suppressClickUntilRef = useRef(0);
    const pointerRef = useRef({ x: 0, y: 0 });

    const isTerminalView = activeView === ViewType.Terminal;
    const groupsById = tabGroupById(tabGroups);

    const draggingSession = draggingSessionId
        ? sessions.find((session) => session.id === draggingSessionId)
        : undefined;

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
    );

    useEffect(() => {
        if (!draggingSessionId) return;

        const handlePointerMove = (event: PointerEvent) => {
            pointerRef.current = { x: event.clientX, y: event.clientY };
        };

        window.addEventListener("pointermove", handlePointerMove);
        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
        };
    }, [draggingSessionId]);

    const handleDragStart = (event: DragStartEvent) => {
        const data = event.active.data.current;
        if (data?.type !== "tab") return;
        setDraggingSessionId(data.sessionId as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setDraggingSessionId(null);
        suppressClickUntilRef.current = Date.now() + 300;

        const { active, over } = event;
        if (!over) {
            setPaneDropTarget(null);
            return;
        }

        const activeData = active.data.current;
        const overData = over.data.current;
        if (activeData?.type !== "tab") {
            setPaneDropTarget(null);
            return;
        }

        const sourceId = activeData.sessionId as string;

        if (overData?.type === "pane-drop") {
            const targetId = overData.sessionId as string;
            const zone =
                paneDropTarget?.sessionId === targetId
                    ? paneDropTarget.zone
                    : "right";
            addSessionToTile(sourceId, targetId, zone);
            setPaneDropTarget(null);
            return;
        }

        if (overData?.type === "tab-drop") {
            const targetId = overData.sessionId as string;
            addSessionToTile(sourceId, targetId, "right");
            setPaneDropTarget(null);
        }
    };

    const handleDragCancel = () => {
        setDraggingSessionId(null);
        setPaneDropTarget(null);
    };

    const suppressClickUntil = useCallback(
        () => Date.now() < suppressClickUntilRef.current,
        [],
    );

    const registerSuppressClick = useCallback(() => {
        suppressClickUntilRef.current = Date.now() + 300;
    }, []);

    const contextValue: TabDragContextValue = {
        draggingSessionId,
        paneDropTarget,
        suppressClickUntil,
        registerSuppressClick,
    };

    return (
        <TabDragContext.Provider value={contextValue}>
            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
            >
                <PaneDropMonitor
                    onPaneDropTargetChange={setPaneDropTarget}
                    pointerRef={pointerRef}
                />
                {children}
                <DragOverlay dropAnimation={null}>
                    {draggingSession ? (
                        <TabDragOverlay
                            session={draggingSession}
                            groupsById={groupsById}
                            isTerminalView={isTerminalView}
                            activeSessionId={activeSessionId}
                            sessions={sessions}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>
        </TabDragContext.Provider>
    );
}

function TabDragOverlay({
    session,
    groupsById,
    isTerminalView,
    activeSessionId,
    sessions,
}: {
    session: TerminalSession;
    groupsById: Map<string, TabGroup>;
    isTerminalView: boolean;
    activeSessionId: string | null;
    sessions: TerminalSession[];
}) {
    const tabGroup = session.tabGroupId
        ? groupsById.get(session.tabGroupId)
        : undefined;

    return (
        <TerminalTab
            session={session}
            displayTitle={tabGroup?.name ?? session.title}
            displayIcon={tabGroup?.icon ?? session.icon}
            displayColor={tabGroup?.color ?? session.color}
            isTabGroup={Boolean(tabGroup)}
            isActive={
                isTerminalView &&
                isSplitGroupActive(session, activeSessionId, sessions)
            }
            onClick={() => {}}
            onClose={() => {}}
            onCloseOthers={() => {}}
            onCloseAll={() => {}}
            enableDragDrop={false}
            isDragOverlay
            splitExtraCount={0}
        />
    );
}
