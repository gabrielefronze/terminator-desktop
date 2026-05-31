import { forwardRef } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<React.ComponentProps<typeof Input>, "size"> & {
    wrapperClassName?: string;
    density?: "default" | "compact";
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
    function SearchInput(
        { className, wrapperClassName, density = "default", ...props },
        ref,
    ) {
        return (
            <div
                className={cn(
                    "relative",
                    density === "default" && "flex-1",
                    wrapperClassName,
                )}
            >
                <Search
                    className={cn(
                        "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        density === "compact" ? "left-2.5" : "left-3",
                    )}
                />
                <Input
                    ref={ref}
                    className={cn(
                        density === "default" &&
                            "w-full border-border bg-input/50 pl-9",
                        density === "compact" &&
                            "h-8 border-border bg-input/50 pl-8 text-sm",
                        className,
                    )}
                    {...props}
                />
            </div>
        );
    },
);
