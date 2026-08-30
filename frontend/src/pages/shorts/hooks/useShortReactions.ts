import { useReactions } from '@hooks';
import type { UseReactionsResult } from '@hooks';
import type { VideoId } from '@models';

export type ShortReactions = UseReactionsResult;

/** Thin wrapper around the shared `useReactions` hook — shorts never toast on like/dislike. */
export function useShortReactions(videoId: VideoId): ShortReactions {
    return useReactions(videoId);
}
