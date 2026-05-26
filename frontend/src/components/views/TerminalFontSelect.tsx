import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { fontFamilyPreviewCss } from "@/lib/terminalFont";

interface TerminalFontSelectProps {
    value: string;
    fonts: string[];
    isLoading?: boolean;
    onValueChange: (family: string) => void;
}

export function TerminalFontSelect({
    value,
    fonts,
    isLoading,
    onValueChange,
}: TerminalFontSelectProps) {
    const { t } = useTranslation("settings");
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);

    const options = useMemo(() => {
        const list = [...fonts];
        if (value && !list.includes(value)) {
            list.unshift(value);
        }
        return list;
    }, [fonts, value]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return options;
        }
        return options.filter((font) => font.toLowerCase().includes(query));
    }, [options, search]);

    useEffect(() => {
        if (!open) {
            setSearch("");
            return;
        }
        const frame = requestAnimationFrame(() => searchRef.current?.focus());
        return () => cancelAnimationFrame(frame);
    }, [open]);

    const placeholder = isLoading
        ? t("terminal_font_loading")
        : t("terminal_font_select_placeholder");

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={isLoading || options.length === 0}
                    className={cn(
                        "h-8 w-full justify-between gap-2 px-2.5 font-normal",
                        !value && "text-muted-foreground",
                    )}
                    style={{ fontFamily: value ? fontFamilyPreviewCss(value) : undefined }}
                >
                    <span className="truncate">
                        {value || placeholder}
                    </span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                sideOffset={4}
                className="w-(--radix-popover-trigger-width) p-0"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <div className="border-b border-border p-2">
                    <Input
                        ref={searchRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("terminal_font_search_placeholder")}
                        className="h-8"
                    />
                </div>
                <div className="h-60 overflow-y-auto p-1">
                    {filtered.length === 0 ? (
                        <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                            {t("terminal_font_no_results")}
                        </p>
                    ) : (
                        filtered.map((font) => {
                            const selected = font === value;
                            return (
                                <button
                                    key={font}
                                    type="button"
                                    className={cn(
                                        "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 pl-2 text-left text-sm outline-none",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        selected && "bg-accent text-accent-foreground",
                                    )}
                                    onClick={() => {
                                        onValueChange(font);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "size-4 shrink-0",
                                            selected ? "opacity-100" : "opacity-0",
                                        )}
                                    />
                                    <span
                                        className="truncate"
                                        style={{
                                            fontFamily:
                                                fontFamilyPreviewCss(font),
                                        }}
                                    >
                                        {font}
                                    </span>
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
