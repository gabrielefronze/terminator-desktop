import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Browser, Events } from "@wailsio/runtime";
import { buildTerminalOptions, TERMINAL_BACKGROUND } from "@/lib/terminalTheme";
import { ErrorCode } from "@/lib/errorCodes";
import { PassphrasePromptModal } from "@/components/terminal/PassphrasePromptModal";
import { useSettings } from "@/hooks/useSettings";
import { parseAppError, handleAppError } from "@/lib/error";
import {
    isTerminalZoomInShortcut,
    isTerminalZoomOutShortcut,
} from "@/lib/keyboardShortcuts";
import { queryClient } from "@/lib/queryClient";
import { adjustTerminalFontSize } from "@/lib/terminalFontSizeAdjust";
import { resolveBroadcastInputTargetSessionIds } from "@/lib/snippetApply";
import { useSessionStore } from "@/store/sessionStore";
import { useUIStore } from "@/store/uiStore";
import { cn, decodeBase64ToUint8Array } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import "@xterm/xterm/css/xterm.css";
import { SshService } from "../../../bindings/terminator-desktop/backend/internal/services/ssh";
import { SSHConnectionConfig } from "../../../bindings/terminator-desktop/backend/internal/services/ssh/models";
import { useTranslation } from "react-i18next";
import { AppEvent } from "@/lib/events.ts";
import { SudoCredential } from "@/store/sessionStore";
import {
    applyUnicode11Addon,
    resolveTerminalFontFamily,
} from "@/lib/terminalSetup";
import {
    syncTerminalWebglRenderer,
    type TerminalWebglAddon,
} from "@/lib/terminalWebgl";

interface TerminalInstanceProps {
    sessionId: string;
    isActive: boolean;
    isFocused?: boolean;
    onActivate?: () => void;
    config: SSHConnectionConfig;
    sudoCredentials?: SudoCredential[];
    terminalFontFamily?: string;
    terminalFontSize?: number;
}

const PASSWORD_PROMPT_REGEX =
    /(?:\[sudo\]\s*password for [^:\r\n]+:|(?:^|[\r\n])password(?: for [^:\r\n]+)?:|root'?s password:)\s*$/i;

function looksLikePasswordPrompt(buffer: string): boolean {
    const cleaned = buffer
        .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "")
        .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "")
        .replace(/\u0007/g, "");
    const tail = cleaned.slice(-240);
    if (PASSWORD_PROMPT_REGEX.test(tail)) {
        return true;
    }
    const lines = tail.split(/\r?\n/);
    const lastLine = (lines[lines.length - 1] ?? "").trim().toLowerCase();
    return (
        lastLine.endsWith(":") &&
        (lastLine.includes("password") || lastLine.includes("passphrase"))
    );
}

export function TerminalInstance({
    sessionId,
    isActive,
    isFocused = false,
    onActivate,
    config,
    sudoCredentials = [],
    terminalFontFamily,
    terminalFontSize,
}: TerminalInstanceProps) {
    const {t} = useTranslation("terminal");
    const {data: settings} = useSettings();
    const [showPasswordMenu, setShowPasswordMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 12, y: 12 });
    const [keyPassphrase, setKeyPassphrase] = useState(config.keyPassphrase ?? "");
    const [showPassphraseModal, setShowPassphraseModal] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const webglAddonRef = useRef<TerminalWebglAddon | null>(null);
    const hasConnectedRef = useRef(false);
    const isReadyRef = useRef(false);
    const promptBufferRef = useRef("");
    const decoderRef = useRef(new TextDecoder("utf-8"));
    const lastPointerRef = useRef({ x: 16, y: 16 });
    const suppressMenuUntilRef = useRef(0);
    const onActivateRef = useRef(onActivate);
    const isFocusedRef = useRef(isFocused);

    onActivateRef.current = onActivate;
    isFocusedRef.current = isFocused;

    const printErrorToTerminal = (error: unknown) => {
        if (!terminalRef.current) return;
        const appError = parseAppError(error);

        console.log(appError)
        const translated = t("error_message", { message: appError.message, error: appError.detailsString })
        terminalRef.current.write(`\r\n\x1b[31m${translated}\x1b[0m\r\n`)
    };

    useEffect(() => {
        promptBufferRef.current = "";
        setShowPasswordMenu(false);
        suppressMenuUntilRef.current = 0;
        setKeyPassphrase(config.keyPassphrase ?? "");
        setIsConnecting(true);
    }, [sessionId, config.keyPassphrase]);

    const connectionLabel = useMemo(() => {
        if (config.local) {
            return t("pane_local");
        }
        if (config.username) {
            return `${config.username}@${config.host}`;
        }
        return config.host;
    }, [config.host, config.local, config.username, t]);

    const hostOverrides = { terminalFontFamily, terminalFontSize };

    const buildConnectConfig = () =>
        new SSHConnectionConfig({
            ...config,
            keyPassphrase: keyPassphrase || undefined,
            keyboardInteractivePassword:
                config.keyboardInteractivePassword || config.password,
        });

    const attemptConnect = () => {
        setIsConnecting(true);
        return SshService.Connect(buildConnectConfig())
            .then(() => {
                isReadyRef.current = true;
                setIsConnecting(false);
                setShowPassphraseModal(false);
                if (terminalRef.current && fitAddonRef.current) {
                    fitAddonRef.current.fit();
                    void SshService.Resize(
                        sessionId,
                        terminalRef.current.rows,
                        terminalRef.current.cols,
                    ).catch(console.error);
                }
            })
            .catch((err) => {
                const appError = parseAppError(err);
                if (appError.code === ErrorCode.SSH_KEY_PASSPHRASE_REQUIRED) {
                    setIsConnecting(false);
                    setShowPassphraseModal(true);
                    return;
                }
                setIsConnecting(false);
                printErrorToTerminal(err);
            });
    };

    const submitSelectedPassword = (password: string) => {
        if (!isReadyRef.current || !password) {
            return;
        }
        suppressMenuUntilRef.current = Date.now() + 2000;
        promptBufferRef.current = "";
        setShowPasswordMenu(false);
        void SshService.Input(sessionId, `${password}\n`).catch(printErrorToTerminal);
    };

    const ingestOutputForPrompt = (chunk: Uint8Array) => {
        if (sudoCredentials.length === 0) {
            return;
        }
        const text = decoderRef.current.decode(chunk, { stream: true });
        if (!text) {
            return;
        }

        const merged = `${promptBufferRef.current}${text}`;
        promptBufferRef.current = merged.slice(-600);

        if (Date.now() < suppressMenuUntilRef.current) {
            return;
        }
        if (looksLikePasswordPrompt(promptBufferRef.current)) {
            const container = containerRef.current;
            if (container) {
                const maxX = Math.max(8, container.clientWidth - 300);
                const maxY = Math.max(8, container.clientHeight - 180);
                setMenuPosition({
                    x: Math.min(maxX, Math.max(8, lastPointerRef.current.x + 10)),
                    y: Math.min(maxY, Math.max(8, lastPointerRef.current.y + 10)),
                });
            }
            setShowPasswordMenu(true);
        }
    };

    useEffect(() => {
        if (!containerRef.current || terminalRef.current) return;
        const container = containerRef.current;
        let disposed = false;

        const init = async () => {
            const fontFamily = await resolveTerminalFontFamily(
                settings?.terminalFontFamily,
            );
            if (disposed || !containerRef.current) return;

            const term = new Terminal({
                ...buildTerminalOptions(settings, hostOverrides),
                fontFamily,
            });
            const fitAddon = new FitAddon();
            const linksAddon = new WebLinksAddon((event, uri) => {
                if (!event.metaKey) {
                    return;
                }
                event.preventDefault();
                void Browser.OpenURL(uri).catch(console.error);
            });

            applyUnicode11Addon(term);
            term.loadAddon(fitAddon);
            term.loadAddon(linksAddon);
            term.open(containerRef.current);
            syncTerminalWebglRenderer(
                term,
                webglAddonRef,
                settings?.terminalWebglRenderer ?? true,
            );

            terminalRef.current = term;
            fitAddonRef.current = fitAddon;

            term.attachCustomKeyEventHandler((arg) => {
                if (arg.type === "keydown") {
                    if (
                        (arg.metaKey || arg.ctrlKey) &&
                        !arg.altKey &&
                        !arg.shiftKey &&
                        arg.code === "KeyT"
                    ) {
                        arg.preventDefault();
                        useUIStore.getState().openNewTabHostPicker();
                        return false;
                    }

                    if (
                        (arg.metaKey || arg.ctrlKey) &&
                        !arg.altKey &&
                        !arg.shiftKey &&
                        arg.code === "KeyB"
                    ) {
                        arg.preventDefault();
                        useUIStore.getState().toggleSidebar();
                        return false;
                    }

                    if (isTerminalZoomInShortcut(arg)) {
                        arg.preventDefault();
                        void adjustTerminalFontSize(1, queryClient).catch(
                            handleAppError,
                        );
                        return false;
                    }

                    if (isTerminalZoomOutShortcut(arg)) {
                        arg.preventDefault();
                        void adjustTerminalFontSize(-1, queryClient).catch(
                            handleAppError,
                        );
                        return false;
                    }

                    if (arg.ctrlKey && arg.shiftKey && arg.code === "KeyC") {
                        arg.preventDefault();
                        const selection = term.getSelection();
                        if (selection) {
                            navigator.clipboard.writeText(selection).catch(console.error);
                        }
                        return false;
                    }

                    if (arg.ctrlKey && arg.shiftKey && arg.code === "KeyV") {
                        arg.preventDefault();
                        navigator.clipboard.readText().then((text) => {
                            if (text && isReadyRef.current) {
                                term.paste(text);
                            }
                        }).catch(console.error);
                        return false;
                    }
                }
                return true;
            });

            const sendInput = (data: string) => {
                const { sessions } = useSessionStore.getState();
                const { commandBroadcastEnabled } = useUIStore.getState();
                const targetIds = resolveBroadcastInputTargetSessionIds(
                    sessionId,
                    sessions,
                    commandBroadcastEnabled,
                );

                for (const targetId of targetIds) {
                    SshService.Input(targetId, data).catch((err) => {
                        if (targetId === sessionId) {
                            printErrorToTerminal(err);
                        }
                    });
                }
            };

            const handleContextMenu = (e: MouseEvent) => {
                e.preventDefault();

                const selection = term.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection).catch(console.error);
                    term.clearSelection();
                } else {
                    navigator.clipboard.readText().then((text) => {
                        if (text && isReadyRef.current) {
                            sendInput(text);
                        }
                    }).catch(console.error);
                }
            };
            const handleMouseMove = (e: MouseEvent) => {
                const rect = container.getBoundingClientRect();
                lastPointerRef.current = {
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                };
            };
            container.addEventListener("contextmenu", handleContextMenu);
            container.addEventListener("mousemove", handleMouseMove);

            if (!hasConnectedRef.current) {
                hasConnectedRef.current = true;
                void attemptConnect();
            }

            const onDataDisposable = term.onData((data) => {
                if (!isReadyRef.current) return;
                sendInput(data);
            });

            const handleFocusIn = () => {
                onActivateRef.current?.();
            };
            container.addEventListener("focusin", handleFocusIn);

            return () => {
                container.removeEventListener("contextmenu", handleContextMenu);
                container.removeEventListener("mousemove", handleMouseMove);
                container.removeEventListener("focusin", handleFocusIn);
                onDataDisposable.dispose();
            };
        };

        let cleanupListeners: (() => void) | undefined;

        void init().then((cleanup) => {
            cleanupListeners = cleanup;
        });

        return () => {
            disposed = true;
            cleanupListeners?.();
            const term = terminalRef.current;
            if (term) {
                syncTerminalWebglRenderer(term, webglAddonRef, false);
                term.dispose();
            }
            terminalRef.current = null;
            fitAddonRef.current = null;
            webglAddonRef.current = null;
            hasConnectedRef.current = false;
            isReadyRef.current = false;
        };
    }, [sessionId]);

    useEffect(() => {
        const term = terminalRef.current;
        if (!term || !settings) return;

        syncTerminalWebglRenderer(
            term,
            webglAddonRef,
            settings.terminalWebglRenderer,
        );
    }, [settings?.terminalWebglRenderer]);

    useEffect(() => {
        const term = terminalRef.current;
        const fit = fitAddonRef.current;
        if (!term || !settings) return;

        let cancelled = false;

        void (async () => {
            const fontFamily = await resolveTerminalFontFamily(
                settings.terminalFontFamily,
            );
            if (cancelled || !terminalRef.current) return;

            term.options.fontFamily = fontFamily;
            term.options.fontSize = buildTerminalOptions(
                settings,
                hostOverrides,
            ).fontSize!;
            webglAddonRef.current?.clearTextureAtlas();

            if (isReadyRef.current && fit) {
                try {
                    fit.fit();
                    SshService.Resize(sessionId, term.rows, term.cols).catch(
                        console.error,
                    );
                } catch (e) {
                    console.warn("xterm fit failed:", e);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [settings, sessionId, terminalFontFamily, terminalFontSize]);

    useEffect(() => {
        const unsubscribe = Events.On(AppEvent.SshData, (event) => {
            if (event.data.id === sessionId && terminalRef.current) {
                const rawBytes = decodeBase64ToUint8Array(event.data.data);

                terminalRef.current.write(rawBytes);
                ingestOutputForPrompt(rawBytes);
            }
        });
        return () => unsubscribe();
    }, [sessionId, sudoCredentials]);

    useEffect(() => {
        if (!isFocused || !isReadyRef.current) return;

        terminalRef.current?.focus();
    }, [isFocused]);

    useEffect(() => {
        if (!isActive || !isReadyRef.current) return;

        const fit = fitAddonRef.current;
        const term = terminalRef.current;
        if (!fit || !term) return;

        const frame = requestAnimationFrame(() => {
            try {
                fit.fit();
                void SshService.Resize(sessionId, term.rows, term.cols).catch(
                    printErrorToTerminal,
                );
            } catch (e) {
                console.warn("xterm fit failed:", e);
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [isActive, sessionId]);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (!isActive || !isReadyRef.current) return;

            const fit = fitAddonRef.current;
            const term = terminalRef.current;
            if (!fit || !term) return;

            try {
                fit.fit();
                if (isFocusedRef.current) {
                    term.focus();
                }
                SshService.Resize(sessionId, term.rows, term.cols).catch((err) => {
                    printErrorToTerminal(err);
                });
            } catch (e) {
                console.warn("xterm fit failed:", e);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [isActive, sessionId]);

    return (
        <div
            className={cn(
                "absolute inset-0 overflow-hidden pl-2",
                isActive ? "block" : "hidden",
            )}
            style={{ backgroundColor: TERMINAL_BACKGROUND }}
        >
            <div
                ref={containerRef}
                className="terminal-host h-full min-h-0 w-full"
                style={{ backgroundColor: TERMINAL_BACKGROUND }}
            />
            {isConnecting && !showPassphraseModal && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    <div className="flex flex-col items-center gap-1 text-center">
                        <p className="text-sm font-medium text-foreground">
                            {t("connecting", { ns: "common" })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {connectionLabel}
                        </p>
                    </div>
                </div>
            )}
            <PassphrasePromptModal
                open={showPassphraseModal}
                onCancel={() => setShowPassphraseModal(false)}
                onSubmit={(passphrase) => {
                    setKeyPassphrase(passphrase);
                    void attemptConnect();
                }}
            />
            {showPasswordMenu && sudoCredentials.length > 0 && (
                <div
                    className="absolute z-20 w-72 rounded-lg border border-border bg-card p-3 shadow-xl"
                    style={{ left: menuPosition.x, top: menuPosition.y }}
                >
                    <p className="mb-2 text-xs text-muted-foreground">
                        {t("choose_password_identity")}
                    </p>
                    <div className="flex flex-col gap-2">
                        {sudoCredentials.map((credential) => (
                            <Button
                                key={credential.id}
                                type="button"
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={() => submitSelectedPassword(credential.password)}
                            >
                                {credential.label}
                            </Button>
                        ))}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                suppressMenuUntilRef.current = Date.now() + 2000;
                                setShowPasswordMenu(false);
                            }}
                        >
                            {t("dismiss_password_menu")}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
