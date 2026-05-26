/// <reference types="vite/client" />

interface WailsEnvironment {
    OS?: string;
    Arch?: string;
    Debug?: boolean;
}

interface Window {
    _wails?: {
        environment?: WailsEnvironment;
    };
}
