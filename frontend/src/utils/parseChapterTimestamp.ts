export function parseChapterTimestamp(ts: string): number {
    const parts = ts.split(':').map(Number);
    const isHMS = parts.length === 3;
    if (isHMS) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return parts[0] * 60 + (parts[1] ?? 0);
}
