import { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { Window } from "@wailsio/runtime";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/hooks/usePlatform";

const windowControlStyles = cva(
    "wails-no-drag inline-flex h-full w-12 items-center justify-center transition-colors",
    {
        variants: {
            intent: {
                default: "text-muted-foreground hover:bg-muted hover:text-foreground",
                close: "text-muted-foreground hover:bg-destructive hover:text-destructive-foreground",
            },
        },
        defaultVariants: { intent: "default" },
    },
);

const macTrafficLightStyles = cva(
    "wails-no-drag inline-flex size-3 shrink-0 items-center justify-center rounded-full border border-black/10 transition-opacity hover:opacity-90",
    {
        variants: {
            color: {
                close: "bg-[#ff5f57]",
                minimise: "bg-[#febc2e]",
                maximise: "bg-[#4a9eed]",
                fullscreen: "bg-[#28c840]",
            },
        },
    },
);

type WindowControlsProps = {
    className?: string;
};

export function WindowControls({ className = "" }: WindowControlsProps) {
    const { isMac } = usePlatform();

    if (isMac) {
        return <MacWindowControls className={className} />;
    }

    return <WindowsWindowControls className={className} />;
}

function useWindowChromeState() {
    const [isMaximised, setIsMaximised] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const sync = () => {
        void Window.IsMaximised().then(setIsMaximised);
        void Window.IsFullscreen().then(setIsFullscreen);
    };

    useEffect(() => {
        sync();
        window.addEventListener("resize", sync);
        return () => window.removeEventListener("resize", sync);
    }, []);

    const toggleMaximise = async () => {
        await Window.ToggleMaximise();
        sync();
    };

    const toggleFullscreen = async () => {
        await Window.ToggleFullscreen();
        sync();
    };

    return { isMaximised, isFullscreen, toggleMaximise, toggleFullscreen };
}

/** macOS traffic lights: red, yellow, green (fullscreen), blue (maximise). */
function MacWindowControls({ className = "" }: WindowControlsProps) {
    const { isMaximised, isFullscreen, toggleMaximise, toggleFullscreen } =
        useWindowChromeState();

    return (
        <div
            className={cn(
                "flex h-full shrink-0 items-center gap-2 px-3",
                className,
            )}
        >
            <button
                type="button"
                tabIndex={-1}
                title="Close"
                aria-label="Close"
                onClick={() => Window.Close()}
                className={macTrafficLightStyles({ color: "close" })}
            />
            <button
                type="button"
                tabIndex={-1}
                title="Minimise"
                aria-label="Minimise"
                onClick={() => Window.Minimise()}
                className={macTrafficLightStyles({ color: "minimise" })}
            />
            <button
                type="button"
                tabIndex={-1}
                title={isFullscreen ? "Exit full screen" : "Enter full screen"}
                aria-label={
                    isFullscreen ? "Exit full screen" : "Enter full screen"
                }
                onClick={() => void toggleFullscreen()}
                className={macTrafficLightStyles({ color: "fullscreen" })}
            />
            <button
                type="button"
                tabIndex={-1}
                title={isMaximised ? "Restore window" : "Maximise window"}
                aria-label={isMaximised ? "Restore window" : "Maximise window"}
                onClick={() => void toggleMaximise()}
                className={macTrafficLightStyles({ color: "maximise" })}
            />
        </div>
    );
}

/** Windows/Linux title-bar controls (frameless). */
function WindowsWindowControls({ className = "" }: WindowControlsProps) {
    const { isMaximised, toggleMaximise } = useWindowChromeState();

    return (
        <div className={cn("flex h-full items-center", className)}>
            <button
                type="button"
                tabIndex={-1}
                onClick={() => Window.Minimise()}
                className={cn(windowControlStyles())}
            >
                <Minus className="size-4" />
            </button>

            <button
                type="button"
                tabIndex={-1}
                onClick={() => void toggleMaximise()}
                className={cn(windowControlStyles())}
            >
                {isMaximised ? (
                    <Copy className="size-3.5" />
                ) : (
                    <Square className="size-3.5" />
                )}
            </button>

            <button
                type="button"
                tabIndex={-1}
                onClick={() => Window.Close()}
                className={cn(windowControlStyles({ intent: "close" }))}
            >
                <X className="size-4" />
            </button>
        </div>
    );
}
