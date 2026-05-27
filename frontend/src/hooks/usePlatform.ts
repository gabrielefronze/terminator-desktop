import { useEffect, useState } from "react";
import { System } from "@wailsio/runtime";
import {
    detectPlatformOS,
    normalizePlatformOS,
    type PlatformOS,
} from "@/lib/platform";

export function usePlatform() {
    const [os, setOs] = useState<PlatformOS>(detectPlatformOS);

    useEffect(() => {
        const sync = (next: PlatformOS) => {
            setOs(next);
            document.documentElement.dataset.platform = next;
        };

        sync(detectPlatformOS());

        System.Environment()
            .then((env) => {
                const next = normalizePlatformOS(env.OS) ?? detectPlatformOS();
                sync(next);
            })
            .catch(() => {});
    }, []);

    return {
        os,
        isMac: os === "darwin",
        /** Emulated controls on all platforms (frameless; native mac lights block right-click). */
        usesCustomWindowControls: os !== "unknown",
    };
}
