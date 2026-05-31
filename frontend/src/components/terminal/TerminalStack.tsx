import { useMemo, useState } from "react";
import { ArrowLeftRight, FileCode2 } from "lucide-react";
import { useSessionStore, type TerminalSession } from "@/store/sessionStore";
import { TerminalInstance } from "@/components/terminal/TerminalInstance";
import { SnippetsPanel } from "@/components/terminal/SnippetsPanel";
import { PortForwardPanel } from "@/components/terminal/PortForwardPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface TerminalStackProps {
    isVisible: boolean;
}

type SidePanel = "none" | "snippets" | "forwards";

function orderSplitPanes(primary: TerminalSession, partner: TerminalSession) {
    if (primary.config.local) return [primary, partner];
    if (partner.config.local) return [partner, primary];
    return [primary, partner];
}

function SessionTerminal({
    session,
    isActive,
}: {
    session: TerminalSession;
    isActive: boolean;
}) {
    return (
        <TerminalInstance
            sessionId={session.id}
            config={session.config}
            sudoCredentials={session.sudoCredentials}
            terminalFontFamily={session.terminalFontFamily}
            terminalFontSize={session.terminalFontSize}
            isActive={isActive}
        />
    );
}

export function TerminalStack({ isVisible }: TerminalStackProps) {
    const { t } = useTranslation("terminal");
    const { sessions, activeSessionId } = useSessionStore();
    const [sidePanel, setSidePanel] = useState<SidePanel>("none");

    const activeSession = sessions.find((s) => s.id === activeSessionId);
    const splitPartner = activeSession?.splitPartnerId
        ? sessions.find((s) => s.id === activeSession.splitPartnerId)
        : undefined;

    const isSplit = Boolean(splitPartner);
    const isRemote = Boolean(activeSession && !activeSession.config.local);

    const splitPanes = useMemo(() => {
        if (!activeSession || !splitPartner) return null;
        return orderSplitPanes(activeSession, splitPartner);
    }, [activeSession, splitPartner]);

    const splitOrderBySessionId = useMemo(() => {
        if (!splitPanes) return new Map<string, number>();
        return new Map(
            splitPanes.map((session, index) => [session.id, index]),
        );
    }, [splitPanes]);

    const visibleSessionIds = useMemo(() => {
        if (splitPanes) {
            return new Set(splitPanes.map((session) => session.id));
        }
        if (activeSession) {
            return new Set([activeSession.id]);
        }
        return new Set<string>();
    }, [splitPanes, activeSession]);

    if (!activeSession) {
        return null;
    }

    return (
        <div
            className={cn(
                "absolute inset-0 flex min-h-0 flex-col",
                !isVisible && "hidden",
            )}
        >
            <div className="flex shrink-0 flex-col gap-1 border-b border-border bg-muted/40 px-2 py-1.5">
                <div className="flex flex-wrap items-center gap-1">
                    <Button
                        type="button"
                        variant={sidePanel === "snippets" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 gap-1.5 px-2.5"
                        disabled={!isRemote}
                        title={
                            isRemote
                                ? undefined
                                : t("toolbar_remote_only_hint")
                        }
                        onClick={() =>
                            setSidePanel((p) =>
                                p === "snippets" ? "none" : "snippets",
                            )
                        }
                    >
                        <FileCode2 className="h-4 w-4" />
                        {t("snippets_title")}
                    </Button>
                    <Button
                        type="button"
                        variant={sidePanel === "forwards" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 gap-1.5 px-2.5"
                        disabled={!isRemote}
                        title={
                            isRemote
                                ? undefined
                                : t("toolbar_remote_only_hint")
                        }
                        onClick={() =>
                            setSidePanel((p) =>
                                p === "forwards" ? "none" : "forwards",
                            )
                        }
                    >
                        <ArrowLeftRight className="h-4 w-4" />
                        {t("port_forward_title")}
                    </Button>
                </div>
                {!isRemote && !isSplit && (
                    <p className="text-xs text-muted-foreground">
                        {t("toolbar_local_hint")}
                    </p>
                )}
            </div>

            <div className="relative flex min-h-0 flex-1">
                <div
                    className={cn(
                        "relative min-h-0 min-w-0",
                        sidePanel !== "none" ? "flex-1" : "h-full w-full",
                        isSplit && "grid flex-1 grid-cols-2 gap-px bg-border",
                    )}
                >
                    {sessions.map((session) => {
                        const isPaneVisible = visibleSessionIds.has(session.id);
                        const isSessionActive =
                            isPaneVisible &&
                            (isSplit || session.id === activeSessionId);
                        const splitOrder = splitOrderBySessionId.get(session.id);

                        return (
                            <div
                                key={session.id}
                                aria-hidden={!isPaneVisible}
                                style={
                                    splitOrder !== undefined
                                        ? { order: splitOrder }
                                        : undefined
                                }
                                className={cn(
                                    !isPaneVisible && "hidden",
                                    isPaneVisible &&
                                        !isSplit &&
                                        "absolute inset-0",
                                    isPaneVisible &&
                                        isSplit &&
                                        "relative flex min-h-0 min-w-0 flex-col bg-background",
                                )}
                            >
                                <div
                                    className={cn(
                                        "shrink-0 border-b border-border bg-muted/30 px-2 py-1 text-xs font-medium text-muted-foreground",
                                        !isSplit && "hidden",
                                    )}
                                >
                                    {session.config.local
                                        ? t("pane_local")
                                        : session.title}
                                </div>
                                <div
                                    className={cn(
                                        "min-h-0",
                                        isSplit && "relative flex-1",
                                        !isSplit && "h-full",
                                    )}
                                >
                                    <SessionTerminal
                                        session={session}
                                        isActive={isSessionActive}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {sidePanel === "snippets" && activeSessionId && isRemote && (
                    <div className="w-56 shrink-0">
                        <SnippetsPanel sessionId={activeSessionId} />
                    </div>
                )}
                {sidePanel === "forwards" && activeSessionId && isRemote && (
                    <div className="w-72 shrink-0">
                        <PortForwardPanel sessionId={activeSessionId} />
                    </div>
                )}
            </div>
        </div>
    );
}
