import type { Video } from '@models/video';
import type { Tag } from '@models/tag';

export const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns the first `count` tags and the number of remaining extras. */
export function getVisibleTags(tags: Tag[], count = 3): { visible: Tag[]; extra: number } {
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
        const isInvalid = !Number.isFinite(seconds) || seconds < 0;
        if (isInvalid) {
            return '0:00';
        }
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

    static bytes(bytes: number): string {
        if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
        if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
        if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(0)} KB`;
        return `${bytes} B`;
    }

    static speed(bytesPerSec: number): string {
        return `${Format.bytes(bytesPerSec)}/s`;
    }

    static eta(seconds: number, locale = 'en'): string {
        if (seconds <= 0 || !Number.isFinite(seconds)) return '';
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' });
        if (seconds < 60) return rtf.format(Math.ceil(seconds), 'second').replace('in ', '') + ' left';
        if (seconds < 3600) return rtf.format(Math.ceil(seconds / 60), 'minute').replace('in ', '') + ' left';
        return rtf.format(Math.ceil(seconds / 3600), 'hour').replace('in ', '') + ' left';
    }

    static percent(value: number): string {
        return `${Math.round(value)}%`;
    }

    static truncate(text: string, max: number): string {
        const isShort = text.length <= max;
        if (isShort) return text;
        return `${text.slice(0, max - 3)}...`;
    }
}
