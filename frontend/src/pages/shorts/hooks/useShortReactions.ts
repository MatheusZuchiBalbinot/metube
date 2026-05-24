import { useVideo, useBurstAnimation } from '@hooks';
import type { VideoId } from '@models';

export interface ShortReactions {
    isLiked: boolean
    isDisliked: boolean
    likeAnimating: boolean
    dislikeAnimating: boolean
    handleLike: () => void
    handleDislike: () => void
}

export function useShortReactions(videoId: VideoId): ShortReactions {
    const { likedVideos, dislikedVideos, likeVideo, dislikeVideo } = useVideo();
    const [likeAnimating, triggerLikeAnimation] = useBurstAnimation();
    const [dislikeAnimating, triggerDislikeAnimation] = useBurstAnimation();

    const isLiked = likedVideos.has(videoId);
    const isDisliked = dislikedVideos.has(videoId);

    function handleLike() {
        likeVideo(videoId);
        triggerLikeAnimation();
    }

    function handleDislike() {
        dislikeVideo(videoId);
        triggerDislikeAnimation();
    }

    return { isLiked, isDisliked, likeAnimating, dislikeAnimating, handleLike, handleDislike };
}
