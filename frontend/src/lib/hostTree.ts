import { Host, HostGroup } from "../../bindings/terminator-desktop/backend/internal/services/blob";
import { hostMatchesSearch, type HostSearchOptions } from "@/lib/hostSearch";

export interface HostTreeNode {
    group: HostGroup;
    hosts: Host[];
    children: HostTreeNode[];
}

export interface HostTreeResult {
    roots: HostTreeNode[];
    uncategorized: Host[];
}

function sortGroups(groups: HostGroup[]): HostGroup[] {
    return [...groups].sort((a, b) => {
        const orderA = a.sortOrder ?? 0;
        const orderB = b.sortOrder ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });
}

function buildNode(
    group: HostGroup,
    groupsByParent: Map<string, HostGroup[]>,
    hostsByGroup: Map<string, Host[]>,
): HostTreeNode {
    const childGroups = groupsByParent.get(group.id) ?? [];
    return {
        group,
        hosts: hostsByGroup.get(group.id) ?? [],
        children: sortGroups(childGroups).map((child) =>
            buildNode(child, groupsByParent, hostsByGroup),
        ),
    };
}

export function buildHostTree(hosts: Host[], groups: HostGroup[]): HostTreeResult {
    const groupsByParent = new Map<string, HostGroup[]>();
    for (const group of groups) {
        const parentKey = group.parentId?.trim() || "";
        const list = groupsByParent.get(parentKey) ?? [];
        list.push(group);
        groupsByParent.set(parentKey, list);
    }

    const hostsByGroup = new Map<string, Host[]>();
    const uncategorized: Host[] = [];

    for (const host of hosts) {
        const groupId = host.groupId?.trim();
        if (!groupId) {
            uncategorized.push(host);
            continue;
        }
        const list = hostsByGroup.get(groupId) ?? [];
        list.push(host);
        hostsByGroup.set(groupId, list);
    }

    const rootGroups = groupsByParent.get("") ?? [];
    const roots = sortGroups(rootGroups).map((group) =>
        buildNode(group, groupsByParent, hostsByGroup),
    );

    return { roots, uncategorized };
}

function hostMatchesQuery(host: Host, search: HostSearchOptions): boolean {
    return hostMatchesSearch(host, search);
}

function groupMatchesQuery(group: HostGroup, query: string): boolean {
    return group.name.toLowerCase().includes(query);
}

function filterNode(
    node: HostTreeNode,
    search: HostSearchOptions,
    groupQuery: string,
): HostTreeNode | null {
    const filteredHosts = node.hosts.filter((h) => hostMatchesQuery(h, search));
    const filteredChildren = node.children
        .map((child) => filterNode(child, search, groupQuery))
        .filter((child): child is HostTreeNode => child !== null);

    const groupMatches = groupMatchesQuery(node.group, groupQuery);
    if (
        groupMatches ||
        filteredHosts.length > 0 ||
        filteredChildren.length > 0
    ) {
        return {
            group: node.group,
            hosts: groupMatches ? node.hosts : filteredHosts,
            children: filteredChildren,
        };
    }
    return null;
}

export function filterHosts(
    hosts: Host[],
    searchQuery: string,
    tagFilter?: string | null,
): Host[] {
    const search: HostSearchOptions = {
        query: searchQuery,
        tag: tagFilter,
    };
    const hasQuery = Boolean(searchQuery.trim());
    const hasTag = Boolean(tagFilter?.trim());
    if (!hasQuery && !hasTag) {
        return hosts;
    }
    return hosts.filter((h) => hostMatchesQuery(h, search));
}

export function filterHostTree(
    tree: HostTreeResult,
    searchQuery: string,
    tagFilter?: string | null,
): HostTreeResult {
    const groupQuery = searchQuery.trim().toLowerCase();
    const search: HostSearchOptions = {
        query: searchQuery,
        tag: tagFilter,
    };
    const hasQuery = Boolean(groupQuery);
    const hasTag = Boolean(tagFilter?.trim());
    if (!hasQuery && !hasTag) {
        return tree;
    }

    const roots = tree.roots
        .map((node) => filterNode(node, search, groupQuery))
        .filter((node): node is HostTreeNode => node !== null);

    const uncategorized = tree.uncategorized.filter((h) =>
        hostMatchesQuery(h, search),
    );

    return { roots, uncategorized };
}

export function flattenGroupsForSelect(
    groups: HostGroup[],
    excludeId?: string,
): { group: HostGroup; depth: number }[] {
    const tree = buildHostTree([], groups);
    const result: { group: HostGroup; depth: number }[] = [];

    const walk = (nodes: HostTreeNode[], depth: number) => {
        for (const node of nodes) {
            if (node.group.id !== excludeId) {
                result.push({ group: node.group, depth });
                walk(node.children, depth + 1);
            }
        }
    };

    walk(tree.roots, 0);
    return result;
}
