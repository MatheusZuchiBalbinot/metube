import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { useBurstAnimation } from '@hooks';
import { ToastType } from '@enums/toastType';
import type { VideoId } from '@models';

interface UseVideoReactionsParams {
    videoId: VideoId | undefined
    likedVideos: Set<VideoId>
    dislikedVideos: Set<VideoId>
    likeVideo: (id: VideoId) => void
    dislikeVideo: (id: VideoId) => void
}

interface UseVideoReactionsResult {
    isLiked: boolean
    isDisliked: boolean
    likeAnimating: boolean
    dislikeAnimating: boolean
    handleLike: () => void
    handleDislike: () => void
}

export function useVideoReactions({
    videoId,
    likedVideos,
    dislikedVideos,
    likeVideo,
    dislikeVideo,
}: UseVideoReactionsParams): UseVideoReactionsResult {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [likeAnimating, triggerLikeAnimation] = useBurstAnimation();
    const [dislikeAnimating, triggerDislikeAnimation] = useBurstAnimation();

    const isLiked = videoId !== undefined && likedVideos.has(videoId);
    const isDisliked = videoId !== undefined && dislikedVideos.has(videoId);

    function handleLike() {
        dispatch(toastActions.addToast({
            message: t(isLiked ? 'toast.unliked' : 'toast.liked'),
            type: ToastType.SUCCESS,
        }));

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
