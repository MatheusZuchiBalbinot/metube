import type { Video } from '@data/mockVideos';

export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns the first `count` tags and the number of remaining extras. */
export function getVisibleTags(tags: string[], count = 3): { visible: string[]; extra: number } {
    return { visible: tags.slice(0, count), extra: Math.max(0, tags.length - count) };
}

/** Counts how many videos each tag appears in. */
export function countTagFrequency(videos: Video[]): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const video of videos) {
        for (const tag of video.tags) {
            freq[tag] = (freq[tag] ?? 0) + 1;
        }
    }
    return freq;
}

export class Format {
    static duration(seconds: number): string {
        const totalSeconds = Math.floor(seconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        const hasHours = hours > 0;
        if (hasHours) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
        return `${minutes}:${String(secs).padStart(2, '0')}`;
    }

    static views(views: number): string {
        const isMillion = views >= 1_000_000;
        if (isMillion) {
            return `${(views / 1_000_000).toFixed(1)}M`;
        }

        const isThousand = views >= 1_000;
        if (isThousand) {
            return `${(views / 1_000).toFixed(1)}K`;
        }

        return String(views);
    }

    static relativeDate(isoDate: string, locale = 'en'): string {
        const diffMs = Date.now() - new Date(isoDate).getTime();
        const diffSec = Math.round(diffMs / 1_000);
        const diffMin = Math.round(diffSec / 60);
        const diffH = Math.round(diffMin / 60);
        const diffD = Math.round(diffH / 24);
        const diffW = Math.round(diffD / 7);
        const diffMo = Math.round(diffD / 30);
        const diffY = Math.round(diffD / 365);

        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

        if (diffSec < 60) {
            return rtf.format(-diffSec, 'second');
        }

        if (diffMin < 60) {
            return rtf.format(-diffMin, 'minute');
        }

        if (diffH < 24) {
            return rtf.format(-diffH, 'hour');
        }

        if (diffD < 7) {
            return rtf.format(-diffD, 'day');
        }

        if (diffW < 5) {
            return rtf.format(-diffW, 'week');
        }

        if (diffMo < 12) {
            return rtf.format(-diffMo, 'month');
        }
        return rtf.format(-diffY, 'year');
    }
}
