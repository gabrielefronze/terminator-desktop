import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTerminalFindStore } from "@/store/terminalFindStore";

interface TerminalFindBarProps {
    onFindNext: () => void;
    onFindPrevious: () => void;
}

export function TerminalFindBar({
    onFindNext,
    onFindPrevious,
}: TerminalFindBarProps) {
    const { t } = useTranslation("terminal");
    const query = useTerminalFindStore((s) => s.query);
    const setQuery = useTerminalFindStore((s) => s.setQuery);
    const close = useTerminalFindStore((s) => s.close);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
        return () => cancelAnimationFrame(frame);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
        }
        if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) {
                onFindPrevious();
            } else {
                onFindNext();
            }
        }
    };

    return (
        <div className="absolute right-3 top-3 z-30 flex items-center gap-1 rounded-lg border border-border bg-card/95 p-1 shadow-lg backdrop-blur-sm">
            <Input
                ref={inputRef}
                data-terminal-find-input="true"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("find_placeholder")}
                className="h-8 w-52 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                aria-label={t("find_placeholder")}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                title={t("find_previous")}
                aria-label={t("find_previous")}
                onClick={onFindPrevious}
            >
                <ChevronUp className="size-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                title={t("find_next")}
                aria-label={t("find_next")}
                onClick={onFindNext}
            >
                <ChevronDown className="size-4" />
            </Button>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 shrink-0"
                title={t("find_close")}
                aria-label={t("find_close")}
                onClick={close}
            >
                <X className="size-4" />
            </Button>
        </div>
    );
}
