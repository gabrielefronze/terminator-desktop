import { Host } from "../../bindings/terminator-desktop/backend/internal/services/blob";

/** Normalize tag list: trim, lowercase, dedupe, sort. */
export function normalizeHostTags(tags: string[] | undefined): string[] {
    if (!tags?.length) {
        return [];
    }
    const seen = new Set<string>();
    const result: string[] = [];
    for (const raw of tags) {
        const tag = raw.trim().toLowerCase();
        if (tag && !seen.has(tag)) {
            seen.add(tag);
            result.push(tag);
        }
    }
    return result.sort((a, b) => a.localeCompare(b));
}

/** Parse comma/semicolon/whitespace-separated tag input. */
export function parseTagsFromInput(input: string): string[] {
    if (!input.trim()) {
        return [];
    }
    const parts = input.split(/[,;]+/).flatMap((chunk) => chunk.split(/\s+/));
    return normalizeHostTags(parts);
}

export function collectAllHostTags(hosts: Host[]): string[] {
    const seen = new Set<string>();
    for (const host of hosts) {
        for (const tag of normalizeHostTags(host.tags)) {
            seen.add(tag);
        }
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
}

export function hostHasTag(host: Host, tag: string): boolean {
    const normalized = tag.trim().toLowerCase();
    if (!normalized) {
        return true;
    }
    return normalizeHostTags(host.tags).includes(normalized);
}

export interface HostSearchOptions {
    query?: string;
    tag?: string | null;
}

const TAG_QUERY_PREFIX = "tag:";

/** Whether a host matches free-text search and/or an exact tag filter. */
export function hostMatchesSearch(
    host: Host,
    options: HostSearchOptions,
): boolean {
    const tagFilter = options.tag?.trim().toLowerCase();
    if (tagFilter && !hostHasTag(host, tagFilter)) {
        return false;
    }

    const query = options.query?.trim().toLowerCase() ?? "";
    if (!query) {
        return true;
    }

    if (query.startsWith(TAG_QUERY_PREFIX)) {
        const tag = query.slice(TAG_QUERY_PREFIX.length).trim();
        return tag ? hostHasTag(host, tag) : true;
    }

    const tags = normalizeHostTags(host.tags);
    const notes = host.notes?.toLowerCase() ?? "";

    return (
        (host.name?.toLowerCase().includes(query) ?? false) ||
        host.host.toLowerCase().includes(query) ||
        host.username.toLowerCase().includes(query) ||
        notes.includes(query) ||
        tags.some((t) => t.includes(query))
    );
}
