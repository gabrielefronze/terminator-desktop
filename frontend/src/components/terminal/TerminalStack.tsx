import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { X } from "lucide-react";
import { useSessionStore, type TerminalSession } from "@/store/sessionStore";
import { TerminalInstance } from "@/components/terminal/TerminalInstance";
import { TabPaneDropOverlay } from "@/components/terminal/TabPaneDropOverlay";
import { useTabDrag } from "@/components/layout/TabDragProvider";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
    collectTilePaneRects,
    collectTileSessionIds,
    percentRectToStyle,
    resolveTileRoot,
    tilePaneStyle,
} from "@/lib/tileLayout";
import { terminalPaneDropId } from "@/lib/tileDrop";
import { normalizeHostColor } from "@/lib/hostAppearance";
import { HostIconBadge } from "@/components/views/HostIconBadge";
import {
    getTitleBarSessions,
    isSplitGroupActive,
} from "@/lib/sessionTabs";

interface TerminalStackProps {
    isVisible: boolean;
}

type SessionPlacement = {
    groupActive: boolean;
    isTiled: boolean;
    style: {
        top: string;
        left: string;
        width: string;
        height: string;
    };
};

function SessionTerminal({
    session,
    isActive,
    isFocused,
    isViewVisible,
    onActivate,
}: {
    session: TerminalSession;
    isActive: boolean;
    isFocused: boolean;
    isViewVisible: boolean;
    onActivate: () => void;
}) {
    return (
        <TerminalInstance
            sessionId={session.id}
            config={session.config}
            sudoCredentials={session.sudoCredentials}
            terminalFontFamily={session.terminalFontFamily}
            terminalFontSize={session.terminalFontSize}
            isActive={isActive}
            isFocused={isFocused}
            isViewVisible={isViewVisible}
            onActivate={onActivate}
        />
    );
}

function computeSessionPlacements(
    sessions: TerminalSession[],
    activeSessionId: string | null,
): Map<string, SessionPlacement> {
    const placements = new Map<string, SessionPlacement>();
    const leaders = getTitleBarSessions(sessions);

    for (const leader of leaders) {
        const root = resolveTileRoot(leader, sessions);
        if (!root) continue;

        const groupActive = isSplitGroupActive(
            leader,
            activeSessionId,
            sessions,
        );
        const isTiled = collectTileSessionIds(root).length > 1;

        if (isTiled) {
            for (const [sessionId, rect] of collectTilePaneRects(root)) {
                placements.set(sessionId, {
                    groupActive,
                    isTiled: true,
                    style: tilePaneStyle(rect),
                });
            }
            continue;
        }

        placements.set(leader.id, {
            groupActive,
            isTiled: false,
            style: percentRectToStyle({
                top: 0,
                left: 0,
                width: 100,
                height: 100,
            }),
        });
    }

    return placements;
}

function PersistentSessionPane({
    session,
    placement,
    dragHighlightColor,
    activeSessionId,
    isViewVisible,
    onClosePane,
    onFocusPane,
}: {
    session: TerminalSession;
    placement: SessionPlacement;
    dragHighlightColor: string;
    activeSessionId: string | null;
    isViewVisible: boolean;
    onClosePane: (sessionId: string) => void;
    onFocusPane: (sessionId: string) => void;
}) {
    const { t } = useTranslation(["terminal", "common"]);
    const { draggingSessionId, paneDropTarget } = useTabDrag();

    const droppable = useDroppable({
        id: terminalPaneDropId(session.id),
        data: { type: "pane-drop", sessionId: session.id },
        disabled:
            !placement.groupActive ||
            !draggingSessionId ||
            draggingSessionId === session.id,
    });

    const isDropTarget =
        placement.groupActive &&
        Boolean(draggingSessionId) &&
        draggingSessionId !== session.id &&
        paneDropTarget?.sessionId === session.id;

    const isTerminalActive =
        placement.groupActive &&
        (placement.isTiled || session.id === activeSessionId);

    const isPaneFocused =
        placement.groupActive && session.id === activeSessionId;
    const hostBorderColor = normalizeHostColor(session.color);
    const paneStyle =
        placement.isTiled
            ? {
                  ...placement.style,
                  borderColor: isPaneFocused
                      ? hostBorderColor
                      : `color-mix(in srgb, ${hostBorderColor} 30%, transparent)`,
              }
            : placement.style;

    return (
        <div
            ref={droppable.setNodeRef}
            aria-hidden={!placement.groupActive}
            style={paneStyle}
            className={cn(
                "absolute flex min-h-0 min-w-0 flex-col bg-background",
                placement.isTiled &&
                    "overflow-hidden rounded-lg border shadow-sm transition-[border-color] duration-200",
                !placement.groupActive && "invisible pointer-events-none",
                placement.groupActive ? "z-10" : "z-0",
            )}
        >
            <div
                className={cn(
                    "flex shrink-0 items-center gap-2 border-b border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground",
                    !placement.isTiled && "hidden",
                )}
            >
                <HostIconBadge
                    icon={session.icon}
                    color={session.color}
                    size="sm"
                />
                <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left hover:text-foreground"
                    onClick={() => onFocusPane(session.id)}
                >
                    {session.config.local ? t("terminal:pane_local") : session.title}
                </button>
                <button
                    type="button"
                    title={t("terminal:pane_close")}
                    aria-label={t("terminal:pane_close")}
                    className="wails-no-drag flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    onClick={(event) => {
                        event.stopPropagation();
                        onClosePane(session.id);
                    }}
                >
                    <X className="size-3" />
                </button>
            </div>
            <div
                className="relative min-h-0 flex-1 overflow-hidden"
                onPointerDown={() => onFocusPane(session.id)}
            >
                <SessionTerminal
                    session={session}
                    isActive={isTerminalActive}
                    isFocused={isPaneFocused}
                    isViewVisible={isViewVisible}
                    onActivate={() => onFocusPane(session.id)}
                />
                <TabPaneDropOverlay
                    zone={isDropTarget ? paneDropTarget?.zone ?? null : null}
                    color={dragHighlightColor}
                    visible={isDropTarget}
                />
            </div>
        </div>
    );
}

export function TerminalStack({ isVisible }: TerminalStackProps) {
    const { sessions, activeSessionId, removeSession, setActiveSession } =
        useSessionStore();
    const { draggingSessionId } = useTabDrag();

    const activeSession = sessions.find((session) => session.id === activeSessionId);

    const placements = useMemo(
        () => computeSessionPlacements(sessions, activeSessionId),
        [sessions, activeSessionId],
    );

    const draggingSession = draggingSessionId
        ? sessions.find((session) => session.id === draggingSessionId)
        : undefined;

    const dragHighlightColor = normalizeHostColor(
        draggingSession?.color ?? activeSession?.color,
    );

    if (sessions.length === 0) {
        return null;
    }

    return (
        <div
            aria-hidden={!isVisible}
            className={cn(
                "absolute inset-0 flex min-h-0 flex-col",
                isVisible
                    ? "z-10"
                    : "invisible pointer-events-none z-0",
            )}
        >
            <div className="relative flex min-h-0 flex-1">
                <div className="relative flex h-full min-h-0 w-full flex-col">
                    {sessions.map((session) => {
                        if (session.forwardOnly) {
                            return null;
                        }

                        const placement = placements.get(session.id);
                        if (!placement) {
                            return (
                                <div key={session.id} className="hidden">
                                    <SessionTerminal
                                        session={session}
                                        isActive={false}
                                        isFocused={false}
                                        isViewVisible={isVisible}
                                        onActivate={() => {}}
                                    />
                                </div>
                            );
                        }

                        return (
                            <PersistentSessionPane
                                key={session.id}
                                session={session}
                                placement={placement}
                                dragHighlightColor={dragHighlightColor}
                                activeSessionId={activeSessionId}
                                isViewVisible={isVisible}
                                onClosePane={removeSession}
                                onFocusPane={setActiveSession}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
