import { SuggestionKind } from '@enums/suggestionKind';
import type { Video } from '@models';
import type { Suggestion } from './types';

const MAX_SUGGESTIONS = 8 as const;

// eslint-disable-next-line complexity
export function buildSuggestions(query: string, videos: Video[]): Suggestion[] {
    const needle = query.toLowerCase();
    const seen = new Set<string>();
    const result: Suggestion[] = [];

    function pushUnique(item: Suggestion) {
        const key = `${item.kind}:${item.value.toLowerCase()}`;
        const isAlreadySeen = seen.has(key);
        const isFull = result.length >= MAX_SUGGESTIONS;

        if (isAlreadySeen || isFull) {
            return;
        }

        seen.add(key);
        result.push(item);
    }

    for (const video of videos) {
        const isMatch = video.title.toLowerCase().includes(needle);

        if (isMatch) {
            pushUnique({ kind: SuggestionKind.VIDEO, label: video.title, value: video.title, targetId: video.id });
        }
    }

    for (const video of videos) {
        const isMatch = video.channel.toLowerCase().includes(needle);

        if (isMatch) {
            pushUnique({ kind: SuggestionKind.CHANNEL, label: video.channel, value: video.channel, targetId: video.channelId });
        }
    }

    for (const video of videos) {
        for (const tag of video.tags) {
            const isMatch = tag.toLowerCase().includes(needle);

            if (isMatch) {
                pushUnique({ kind: SuggestionKind.TAG, label: `#${tag}`, value: tag, targetId: tag });
            }
        }
    }

    return result;
}
