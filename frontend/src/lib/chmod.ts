/** Parse octal chmod string (e.g. "644", "0755") to a Unix mode number. */
export function parseChmodMode(input: string): number | null {
    const trimmed = input.trim();
    if (!/^[0-7]{3,4}$/.test(trimmed)) {
        return null;
    }
    return parseInt(trimmed, 8);
}
