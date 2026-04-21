import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { useTranslation } from 'react-i18next';
import { Pin, PinOff, Bookmark, BookmarkCheck } from 'lucide-react';
import { VideoStatus, type Video } from '@data/mockVideos';
import type { Tag } from '@models/tag';
import type { VideoId } from '@models/video';
import { ROUTES } from '@utils/routes';
import { Format, ONE_WEEK_MS, getVisibleTags } from '@utils/format';
import { TagColors } from '@utils/tagColors';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions, selectSavedSet } from '@store/videoSlice';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import SavePopover from './savePopover';
import TagBadge from '@components/tag/badge';
import VideoStatusBadges from './statusBadges';
import './card.css';

interface VideoCardProps {
    video: Video
    showActions?: boolean
    index?: number
    onEdit?: (video: Video) => void
    onDelete?: (id: VideoId) => void
}

function buildVideoCardClass(showActions: boolean) {
    return ['video-card', showActions ? 'video-card--with-actions' : '']
        .filter(Boolean)
        .join(' ');
}

// eslint-disable-next-line complexity
const VideoCard = memo(function VideoCard({
    video,
    showActions = false,
    index: _index,
    onEdit,
    onDelete,
}: VideoCardProps) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const progress = useAppSelector(s => s.video.videoProgress[video.id] ?? 0);
    const isPinned = useAppSelector(s => s.video.pinnedVideoId === video.id);
    const savedSet = useAppSelector(selectSavedSet);
    const isSaved = savedSet.has(video.id);

    const palette = TagColors.palette(video.tags[0] ?? video.id);
    const { visible: visibleTags, extra: extraTagCount } = getVisibleTags(video.tags);
    const hasExtraTags = extraTagCount > 0;

    const hasProgress = progress > 4 && progress < 96;
    const isWatched = progress >= 95;

    const now = new Date();
    const isScheduledAndFuture =
        video.status === VideoStatus.SCHEDULED &&
        video.scheduledAt !== undefined &&
        new Date(video.scheduledAt) > now;

    const isNew = !isScheduledAndFuture && now.getTime() - new Date(video.publishedAt).getTime() < ONE_WEEK_MS;
    const isProcessing = video.status === VideoStatus.PROCESSING;
    const isFailed = video.status === VideoStatus.FAILED;

    const [thumbLoaded, setThumbLoaded] = useState(false);
    const isTouchDevice = useMediaQuery('(hover: none)');

    function handlePin(e: React.MouseEvent) {
        e.stopPropagation();
        dispatch(videoActions.pinVideo(video.id));
    }

    function handleCardClick() {
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleCardKeyDown(e: React.KeyboardEvent) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) {
            return;
        }
        e.preventDefault();
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleChannelClick(e: React.MouseEvent) {
        e.stopPropagation();
        navigate(ROUTES.CHANNEL.replace(':id', video.channelId));
    }

    function handleChannelKeyDown(e: React.KeyboardEvent) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        navigate(ROUTES.CHANNEL.replace(':id', video.channelId));
    }

    function handleEdit(e: React.MouseEvent) {
        e.stopPropagation();
        onEdit?.(video);
    }

    function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        onDelete?.(video.id);
    }

    function handleTagClick(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) {
        e.stopPropagation();
        dispatch(videoActions.openTagView({ tag, fromVideoId: video.id }));
    }

    return (
        <article
            className={buildVideoCardClass(showActions)}
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            style={{ '--vc-color': palette.color, '--vc-bg': palette.bg } as React.CSSProperties}
        >
            <div className="video-card__thumb">
                <img
                    className="video-card__thumb-img"
                    src={video.thumbnail}
                    alt={video.title}
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setThumbLoaded(true)}
                    style={{ opacity: thumbLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
                />
                <div className="video-card__play-overlay" aria-hidden="true">
                    <svg className="video-card__play-icon" viewBox="0 0 24 24" fill="white">
                        <polygon points="6,3 20,12 6,21" />
                    </svg>
                </div>
                <VideoStatusBadges
                    isScheduledAndFuture={isScheduledAndFuture}
                    isNew={isNew}
                    isWatched={isWatched}
                    isProcessing={isProcessing}
                    isFailed={isFailed}
                    classPrefix="video-card"
                />
                {hasProgress && (
                    <div className="video-card__progress-bar">
                        <div
                            className="video-card__progress-fill"
                            style={{ transform: `scaleX(${progress / 100})` }}
                        />
                    </div>
                )}
                {video.duration !== undefined && video.duration > 0 && (
                    <div className="video-card__duration-badge">
                        {Format.duration(video.duration)}
                    </div>
                )}
                <div className={['video-card__save-trigger', isTouchDevice ? 'video-card__save-trigger--touch' : ''].filter(Boolean).join(' ')}>
                    <SavePopover videoId={video.id}>
                        <Tooltip content={t('video.save')} side="top">
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label={t('video.save')}
                                aria-pressed={isSaved}
                                className={['video-card__save-btn', isSaved ? 'video-card__save-btn--active' : ''].filter(Boolean).join(' ')}
                            >
                                {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                            </Button>
                        </Tooltip>
                    </SavePopover>
                </div>
            </div>

            <div className="video-card__body">
                <p className="video-card__title">{video.title}</p>

                <div className="video-card__meta">
                    <span
                        className="video-card__meta-channel"
                        role="button"
                        tabIndex={0}
                        onClick={handleChannelClick}
                        onKeyDown={handleChannelKeyDown}
                    >
                        {video.channel}
                    </span>
                    <div className="video-card__meta-sub">
                        <span className="video-card__meta-views">{Format.views(video.views)} {t('video.views')}</span>
                        <span className="video-card__meta-dot" aria-hidden="true">·</span>
                        <span className="video-card__meta-date">{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                    </div>
                </div>

                <div className="video-card__tags">
                    {visibleTags.map(tag => (
                        <TagBadge
                            key={tag}
                            tag={tag}
                            className="video-card__tag"
                            title={t('card.seeTagVideos', 'Ver vídeos com esta tag')}
                            onClick={handleTagClick}
                        />
                    ))}
                    {hasExtraTags && (
                        <span className="video-card__tags-more">+{extraTagCount}</span>
                    )}
                </div>

                {showActions && (
                    <div className="video-card__actions">
                        <Tooltip content={isPinned ? t('video.unpin') : t('video.pin')} side="top">
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label={isPinned ? t('video.unpin') : t('video.pin')}
                                aria-pressed={isPinned}
                                className={isPinned ? 'video-card__pin-btn--active' : ''}
                                onClick={handlePin}
                            >
                                {isPinned ? <PinOff size={13} /> : <Pin size={13} />}
                            </Button>
                        </Tooltip>
                        <Button variant="ghost" size="sm" onClick={handleEdit}>
                            {t('video.edit')}
                        </Button>
                        <Button variant="danger" size="sm" onClick={handleDelete}>
                            {t('video.delete')}
                        </Button>
                    </div>
                )}
            </div>
        </article>
    );
});

export default VideoCard;
