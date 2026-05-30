import { Tooltip } from '@ui';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';

interface ReactionPillProps {
    isLiked: boolean
    isDisliked: boolean
    isLikeAnimating?: boolean
    isDislikeAnimating?: boolean
    likeIcon: React.ReactNode
    likeIconActive: React.ReactNode
    dislikeIcon: React.ReactNode
    dislikeIconActive: React.ReactNode
    onLike: () => void
    onDislike: () => void
}

export default function ReactionPill({
    isLiked,
    isDisliked,
    isLikeAnimating,
    isDislikeAnimating,
    likeIcon,
    likeIconActive,
    dislikeIcon,
    dislikeIconActive,
    onLike,
    onDislike,
}: ReactionPillProps) {
    const { t } = useTranslation();

    const likeClass = cn(
        'video-page__pill-btn',
        isLiked && 'video-page__pill-btn--liked',
    );

    const dislikeClass = cn(
        'video-page__pill-btn',
        isDisliked && 'video-page__pill-btn--disliked',
    );

    return (
        <div className="video-page__reaction-pill" role="group" aria-label={t('video.reactions')}>
            <Tooltip content={isLiked ? t('video.liked') : t('video.like')} side="top">
                <button
                    type="button"
                    className={likeClass}
                    onClick={onLike}
                    aria-pressed={isLiked}
                    aria-label={isLiked ? t('video.liked') : t('video.like')}
                    data-animating={isLikeAnimating ? 'true' : undefined}
                >
                    {isLiked ? likeIconActive : likeIcon}
                </button>
            </Tooltip>

            <span className="video-page__pill-sep" aria-hidden="true" />

            <Tooltip content={isDisliked ? t('video.disliked') : t('video.dislike')} side="top">
                <button
                    type="button"
                    className={dislikeClass}
                    onClick={onDislike}
                    aria-pressed={isDisliked}
                    aria-label={isDisliked ? t('video.disliked') : t('video.dislike')}
                    data-animating={isDislikeAnimating ? 'true' : undefined}
                >
                    {isDisliked ? dislikeIconActive : dislikeIcon}
                </button>
            </Tooltip>
        </div>
    );
}
