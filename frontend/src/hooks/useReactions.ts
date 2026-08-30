import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import type { VideoId } from '@models';
import { useBurstAnimation } from './useBurstAnimation';
import { useVideoData } from './useVideoData';
import { useVideoActions } from './useVideoActions';

interface UseReactionsOptions {
    /** Show a toast on like. Off by default — pass `true` only for call sites that
     *  already showed one (the video page did; shorts never did). Dislike never
     *  toasts on either existing call site, so there is no dislike-toast option. */
    toast?: boolean
}

export interface UseReactionsResult {
    isLiked: boolean
    isDisliked: boolean
    likeAnimating: boolean
    dislikeAnimating: boolean
    handleLike: () => void
    handleDislike: () => void
}

/**
 * Shared like/dislike toggle logic used by both the video page and shorts feed.
 * Reads `likedVideos`/`dislikedVideos` from Redux and drives the burst animations.
 */
export function useReactions(videoId: VideoId | undefined, options: UseReactionsOptions = {}): UseReactionsResult {
    const { toast = false } = options;
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { likedVideos, dislikedVideos } = useVideoData();
    const { likeVideo, dislikeVideo } = useVideoActions();
    const [likeAnimating, triggerLikeAnimation] = useBurstAnimation();
    const [dislikeAnimating, triggerDislikeAnimation] = useBurstAnimation();

    const isLiked = videoId !== undefined && likedVideos.has(videoId);
    const isDisliked = videoId !== undefined && dislikedVideos.has(videoId);

    function handleLike() {
        if (toast) {
            dispatch(toastActions.addToast({
                message: t(isLiked ? 'toast.unliked' : 'toast.liked'),
                type: ToastType.SUCCESS,
            }));
        }

        if (videoId !== undefined) {
            likeVideo(videoId);
        }

        triggerLikeAnimation();
    }

    function handleDislike() {
        if (videoId !== undefined) {
            dislikeVideo(videoId);
        }

        triggerDislikeAnimation();
    }

    return { isLiked, isDisliked, likeAnimating, dislikeAnimating, handleLike, handleDislike };
}
