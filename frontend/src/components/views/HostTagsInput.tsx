import { KeyboardEvent, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { normalizeHostTags } from "@/lib/hostSearch";
import { cn } from "@/lib/utils";

interface HostTagsInputProps {
    tags: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    hint?: string;
    className?: string;
}

export function HostTagsInput({
    tags,
    onChange,
    placeholder,
    hint,
    className,
}: HostTagsInputProps) {
    const [draft, setDraft] = useState("");
    const normalized = normalizeHostTags(tags);

    const addFromDraft = () => {
        const next = normalizeHostTags([...normalized, ...draft.split(/[,;]+/)]);
        if (next.length !== normalized.length || draft.trim()) {
            onChange(next);
        }
        setDraft("");
    };

    const removeTag = (tag: string) => {
        onChange(normalized.filter((t) => t !== tag));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addFromDraft();
        } else if (
            e.key === "Backspace" &&
            !draft &&
            normalized.length > 0
        ) {
            onChange(normalized.slice(0, -1));
        }
    };

    return (
        <div className={cn("grid gap-1.5", className)}>
            <div
                className="flex min-h-9 flex-wrap gap-1.5 rounded-md border border-border bg-background/50 p-2"
            >
                {normalized.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
                    >
                        {tag}
                        <button
                            type="button"
                            className="rounded p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                            onClick={() => removeTag(tag)}
                            aria-label={`Remove tag ${tag}`}
                        >
                            <X className="size-3" />
                        </button>
                    </span>
                ))}
                <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addFromDraft}
                    placeholder={
                        normalized.length === 0 ? placeholder : undefined
                    }
                    className="h-7 min-w-[6rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                />
            </div>
            {hint ? (
                <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
        </div>
    );
}
