import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Container, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ContainerCard } from "@/components/views/ContainerCard";
import {
    ResourceGrid,
    ResourceGridItem,
} from "@/components/views/ResourceGrid";
import {
    filterContainers,
    useContainerRuntime,
    useContainers,
} from "@/hooks/useContainers";
import { buildSessionFromContainer } from "@/lib/connectContainer";
import { useSessionStore } from "@/store/sessionStore";
import { RunningContainer } from "../../../bindings/terminator-desktop/backend/internal/services/containers";
import { cn } from "@/lib/utils";
import { parseAppError } from "@/lib/error";

export function ContainersPage() {
    const { t } = useTranslation(["containers", "common"]);
    const addSession = useSessionStore((state) => state.addSession);
    const [searchQuery, setSearchQuery] = useState("");
    const [runtime, setRuntime] = useState("");

    const detectedRuntime = useContainerRuntime();
    const {
        data: containers,
        isLoading,
        isFetching,
        error,
        refetch,
    } = useContainers(runtime);

    const visibleContainers = useMemo(
        () => filterContainers(containers, searchQuery),
        [containers, searchQuery],
    );

    const runtimeMissing = detectedRuntime.isError && runtime === "";
    const listError = error ? parseAppError(error).message : null;

    const handleConnect = (container: RunningContainer) => {
        addSession(buildSessionFromContainer(container));
    };

    return (
        <div className="flex h-full w-full flex-col overflow-y-auto p-8">
            <div className="mb-8 flex w-full flex-wrap items-center gap-4">
                <h1 className="shrink-0 text-2xl font-bold tracking-tight text-foreground">
                    {t("page_title")}
                </h1>
                <SearchInput
                    placeholder={t("search_containers")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="flex items-center gap-2">
                    <Label htmlFor="container-runtime" className="sr-only">
                        {t("runtime")}
                    </Label>
                    <Select
                        value={runtime || "auto"}
                        onValueChange={(value) =>
                            setRuntime(value === "auto" ? "" : value)
                        }
                    >
                        <SelectTrigger id="container-runtime" className="w-[140px]">
                            <SelectValue placeholder={t("runtime_auto")} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="auto">{t("runtime_auto")}</SelectItem>
                            <SelectItem value="docker">{t("runtime_docker")}</SelectItem>
                            <SelectItem value="podman">{t("runtime_podman")}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void refetch()}
                    disabled={isFetching}
                    title={t("refresh")}
                    aria-label={t("refresh")}
                >
                    <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
                </Button>
            </div>

            {isLoading && (
                <div className="text-sm text-muted-foreground">
                    {t("loading")}
                </div>
            )}

            {runtimeMissing && !isLoading && (
                <div
                    className="flex flex-col items-center justify-center rounded-xl border-2
                               border-dashed border-border py-16 text-center"
                >
                    <Container className="mb-4 size-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">
                        {t("empty_runtime_title")}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                        {t("empty_runtime_desc")}
                    </p>
                </div>
            )}

            {!runtimeMissing && listError && !isLoading && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {listError}
                </div>
            )}

            {!isLoading &&
                !runtimeMissing &&
                !listError &&
                (containers?.length ?? 0) === 0 && (
                <div
                    className="flex flex-col items-center justify-center rounded-xl border-2
                               border-dashed border-border py-16 text-center"
                >
                    <Container className="mb-4 size-10 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground">
                        {t("empty_title")}
                    </h3>
                    <p className="mt-2 max-w-md text-sm text-muted-foreground">
                        {t("empty_desc")}
                    </p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => void refetch()}
                    >
                        <RefreshCw className="size-4" />
                        {t("refresh")}
                    </Button>
                </div>
            )}

            {!isLoading && visibleContainers.length > 0 && (
                <ResourceGrid>
                    {visibleContainers.map((container) => (
                        <ResourceGridItem
                            key={`${container.runtime}:${container.id}`}
                        >
                            <ContainerCard
                                container={container}
                                onConnect={handleConnect}
                            />
                        </ResourceGridItem>
                    ))}
                </ResourceGrid>
            )}

            {!isLoading &&
                (containers?.length ?? 0) > 0 &&
                visibleContainers.length === 0 &&
                searchQuery.trim() && (
                <p className="text-center text-sm text-muted-foreground">
                    {t("no_search_results")}
                </p>
            )}
        </div>
    );
}
