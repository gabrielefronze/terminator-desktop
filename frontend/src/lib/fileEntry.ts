export type FileEntry = {
    name: string;
    path: string;
    size: number;
    isDir: boolean;
    modTime: number;
};

export function parentLocalPath(dirPath: string): string {
    const cleaned = dirPath.replace(/[/\\]+$/, "");
    if (cleaned === "" || cleaned === "/") {
        return "/";
    }
    const sep = cleaned.includes("\\") ? "\\" : "/";
    const parts = cleaned.split(/[/\\]/).filter(Boolean);
    if (parts.length <= 1) {
        return sep === "\\" ? `${parts[0]}\\` : "/";
    }
    parts.pop();
    return sep === "\\" ? parts.join("\\") : `/${parts.join("/")}`;
}

export function parentRemotePath(remotePath: string): string {
    if (remotePath === "." || remotePath === "/") {
        return "/";
    }
    const parts = remotePath.replace(/\\/g, "/").split("/").filter(Boolean);
    parts.pop();
    return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

export function joinRemotePath(dir: string, name: string): string {
    const base = dir === "." ? "" : dir.replace(/\/$/, "");
    if (base === "" || base === "/") {
        return `/${name}`;
    }
    return `${base}/${name}`;
}

export function joinLocalPath(dir: string, name: string): string {
    const sep = dir.includes("\\") ? "\\" : "/";
    if (dir.endsWith(sep)) {
        return `${dir}${name}`;
    }
    return `${dir}${sep}${name}`;
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
