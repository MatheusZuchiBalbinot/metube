import type { VideoId } from '@models';

/**
 * Returns a new list with `item` at the front, appearing exactly once.
 *
 * Encodes the "ordered by recency, no duplicates" rule shared by the watch
 * history and the normalized video order.
 */
export function moveToFront<T>(list: readonly T[], item: T): T[] {
    return [item, ...list.filter(existing => existing !== item)];
}

export interface ReactionLists {
    primary: VideoId[]
    opposite: VideoId[]
}

/**
 * Toggles `id` in `primary`. Adding it removes it from `opposite` (likes and
 * dislikes are mutually exclusive); removing it leaves `opposite` untouched.
 */
export function toggleReaction(primary: VideoId[], opposite: VideoId[], id: VideoId): ReactionLists {
    const isActive = primary.includes(id);

    if (isActive) {
        return { primary: primary.filter(existing => existing !== id), opposite };
    }

    return { primary: [...primary, id], opposite: opposite.filter(existing => existing !== id) };
}
