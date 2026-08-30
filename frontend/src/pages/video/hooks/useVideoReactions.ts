import { useReactions } from '@hooks';
import type { UseReactionsResult } from '@hooks';
import type { VideoId } from '@models';

interface UseVideoReactionsParams {
    videoId: VideoId | undefined
    likedVideos: Set<VideoId>
    dislikedVideos: Set<VideoId>
    likeVideo: (id: VideoId) => void
    dislikeVideo: (id: VideoId) => void
}

export type UseVideoReactionsResult = UseReactionsResult;

/**
 * Thin wrapper around the shared `useReactions` hook (see `@hooks/useReactions`),
 * kept so the video page's existing call shape doesn't need to change.
 * `likedVideos`/`dislikedVideos`/`likeVideo`/`dislikeVideo` are accepted for
 * backward compatibility but not read — `useReactions` sources the same Redux
 * state itself. The video page toasts on like (its pre-existing behavior),
 * preserved here via `{ toast: true }`.
 */
export function useVideoReactions({ videoId }: UseVideoReactionsParams): UseVideoReactionsResult {
    return useReactions(videoId, { toast: true });
}
