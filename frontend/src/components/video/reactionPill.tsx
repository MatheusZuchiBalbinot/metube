import { Tooltip } from '@ui';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';

function resolvePillClass(isState: boolean, stateClass: string) {
    return cn('video-page__pill-btn', isState && stateClass);
}

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

    const likeClass = resolvePillClass(isLiked, 'video-page__pill-btn--liked');
    const dislikeClass = resolvePillClass(isDisliked, 'video-page__pill-btn--disliked');
    const likeLabel = isLiked ? t('video.liked') : t('video.like');
    const dislikeLabel = isDisliked ? t('video.disliked') : t('video.dislike');

    return (
        <div className="video-page__reaction-pill" role="group" aria-label={t('video.reactions')}>
            <Tooltip content={likeLabel} side="top">
                <button
                    type="button"
                    className={likeClass}
                    onClick={onLike}
                    aria-pressed={isLiked}
                    aria-label={likeLabel}
                    data-animating={isLikeAnimating ? 'true' : undefined}
                >
                    {isLiked ? likeIconActive : likeIcon}
                </button>
            </Tooltip>

            <span className="video-page__pill-sep" aria-hidden="true" />

            <Tooltip content={dislikeLabel} side="top">
                <button
                    type="button"
                    className={dislikeClass}
                    onClick={onDislike}
                    aria-pressed={isDisliked}
                    aria-label={dislikeLabel}
                    data-animating={isDislikeAnimating ? 'true' : undefined}
                >
                    {isDisliked ? dislikeIconActive : dislikeIcon}
                </button>
            </Tooltip>
        </div>
    );
}
