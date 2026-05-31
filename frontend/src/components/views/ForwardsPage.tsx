import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PortForwardPanel } from "@/components/terminal/PortForwardPanel";
import { useSessionStore } from "@/store/sessionStore";
import { HostIconBadge } from "@/components/views/HostIconBadge";

export function ForwardsPage() {
    const { t } = useTranslation(["forwards", "terminal"]);
    const { sessions, activeSessionId } = useSessionStore();
    const [selectedSessionId, setSelectedSessionId] = useState<string>("");

    const remoteSessions = useMemo(
        () => sessions.filter((session) => !session.config.local),
        [sessions],
    );

    useEffect(() => {
        if (remoteSessions.length === 0) {
            setSelectedSessionId("");
            return;
        }

        const activeRemote = remoteSessions.find(
            (session) => session.id === activeSessionId,
        );
        if (activeRemote) {
            setSelectedSessionId(activeRemote.id);
            return;
        }

        setSelectedSessionId((current) =>
            remoteSessions.some((session) => session.id === current)
                ? current
                : remoteSessions[0].id,
        );
    }, [activeSessionId, remoteSessions]);

    if (remoteSessions.length === 0) {
        return (
            <div className="flex h-full w-full flex-col overflow-y-auto p-8">
                <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">
                    {t("forwards:page_title")}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {t("forwards:empty_state")}
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {t("forwards:page_title")}
                </h1>
                <div className="w-full max-w-sm space-y-2">
                    <Label htmlFor="forwards-session">
                        {t("forwards:select_session")}
                    </Label>
                    <Select
                        value={selectedSessionId}
                        onValueChange={setSelectedSessionId}
                    >
                        <SelectTrigger id="forwards-session">
                            <SelectValue
                                placeholder={t("forwards:select_session_placeholder")}
                            />
                        </SelectTrigger>
                        <SelectContent>
                            {remoteSessions.map((session) => (
                                <SelectItem key={session.id} value={session.id}>
                                    <span className="flex items-center gap-2">
                                        <HostIconBadge
                                            icon={session.icon}
                                            color={session.color}
                                            size="sm"
                                        />
                                        {session.title}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {selectedSessionId && (
                <div className="max-w-lg">
                    <PortForwardPanel
                        sessionId={selectedSessionId}
                        layout="page"
                    />
                </div>
            )}
        </div>
    );
}
