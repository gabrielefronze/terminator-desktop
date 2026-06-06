import { RunningContainer } from "../../bindings/terminator-desktop/backend/internal/services/containers";
import { DEFAULT_HOST_COLOR } from "@/lib/hostAppearance";
import type { CreateSessionParams } from "@/store/sessionStore";

export function buildSessionFromContainer(
    container: RunningContainer,
): CreateSessionParams {
    return {
        local: false,
        host: container.name,
        port: 0,
        username: "",
        title: container.name,
        icon: "container",
        color: DEFAULT_HOST_COLOR,
        containerId: container.id,
        containerRuntime: container.runtime,
    };
}
