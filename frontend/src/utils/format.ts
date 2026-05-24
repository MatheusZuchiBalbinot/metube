import type { Video, Tag, ViewCount } from '@models';

/** Returns the first `count` tags and the number of remaining extras. */
export function getVisibleTags(tags: Tag[], count = 3): { visible: Tag[]; extra: number } {
    return { visible: tags.slice(0, count), extra: Math.max(0, tags.length - count) };
}

/** Counts how many videos each tag appears in. */
export function countTagFrequency(videos: Video[]): Map<Tag, number> {
    const freq = new Map<Tag, number>();
    for (const video of videos) {
        for (const tag of video.tags) {
            freq.set(tag, (freq.get(tag) ?? 0) + 1);
        }
    }
    return freq;
}

export class Format {
    static views(views: ViewCount): string {
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

    static bytes(bytes: number): string {
        if (bytes >= 1_073_741_824) {
            return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
        }

        if (bytes >= 1_048_576) {
            return `${(bytes / 1_048_576).toFixed(1)} MB`;
        }

        if (bytes >= 1_024) {
            return `${(bytes / 1_024).toFixed(0)} KB`;
        }

        return `${bytes} B`;
    }

    static speed(bytesPerSec: number): string {
        return `${Format.bytes(bytesPerSec)}/s`;
    }

    static percent(value: number): string {
        return `${Math.round(value)}%`;
    }

    static truncate(text: string, max: number): string {
        const isShort = text.length <= max;

        if (isShort) {
            return text;
        }

        return `${text.slice(0, max - 3)}...`;
    }
}
