import { useSessionStore } from "@/store/sessionStore";
import { TerminalInstance } from "@/components/terminal/TerminalInstance";
import { cn } from "@/lib/utils";

interface TerminalStackProps {
    isVisible: boolean;
}

export function TerminalStack({isVisible}: TerminalStackProps) {
    const {sessions, activeSessionId} = useSessionStore();

    return (
        <div
            className={cn(
                "relative h-full min-h-0 w-full",
                !isVisible && "hidden",
            )}
        >
            {sessions.map((session) => (
                <TerminalInstance
                    key={session.id}
                    sessionId={session.id}
                    config={session.config}
                    sudoCredentials={session.sudoCredentials}
                    isActive={session.id === activeSessionId}
                />
            ))}
        </div>
    );
}