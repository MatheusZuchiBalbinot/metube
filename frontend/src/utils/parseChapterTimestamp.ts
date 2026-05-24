import type { Seconds } from '@models/units';

export function parseChapterTimestamp(ts: string): Seconds {
    const parts = ts.split(':').map(Number);
    const isHMS = parts.length === 3;
    const raw = isHMS
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + (parts[1] ?? 0);
    return raw as unknown as Seconds;
}
