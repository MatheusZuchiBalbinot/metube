import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Pin, PinOff } from 'lucide-react';
import { VideoStatus, type Video } from '@data/mockVideos';
import { ROUTES } from '@utils/routes';
import { Format } from '@utils/format';
import { TagColors } from '@utils/tagColors';
import { useVideo } from '@context/useVideo';
import Badge from '@ui/badge/badge';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import './card.css';

interface VideoCardProps {
    video: Video
    showActions?: boolean
    index?: number
    onEdit?: (video: Video) => void
    onDelete?: (id: string) => void
}

function buildVideoCardClass(showActions: boolean) {
    return ['video-card', showActions ? 'video-card--with-actions' : '']
        .filter(Boolean)
        .join(' ');
}

// eslint-disable-next-line complexity
export default function VideoCard({
    video,
    showActions = false,
    index,
    onEdit,
    onDelete,
}: VideoCardProps) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { openTagView, videoProgress, pinnedVideoId, pinVideo } = useVideo();

    const palette = TagColors.palette(video.tags[0] ?? video.id);
    const visibleTags = video.tags.slice(0, 3);
    const extraTagCount = video.tags.length - 3;
    const hasExtraTags = extraTagCount > 0;

    const progress = videoProgress[video.id] ?? 0;
    const hasProgress = progress > 4 && progress < 96;
    const isWatched = progress >= 95;

    const now = new Date();
    const isScheduledAndFuture =
        video.status === VideoStatus.SCHEDULED &&
        video.scheduledAt !== undefined &&
        new Date(video.scheduledAt) > now;

    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const isNew = !isScheduledAndFuture && Date.now() - new Date(video.publishedAt).getTime() < ONE_WEEK_MS;

    const isPinned = pinnedVideoId === video.id;
    const [thumbLoaded, setThumbLoaded] = useState(false);

    function handlePin(e: React.MouseEvent) {
        e.stopPropagation();
        pinVideo(video.id);
    }

    function handleCardClick() {
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleChannelClick(e: React.MouseEvent) {
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

    function handleTagClick(e: React.MouseEvent, tag: string) {
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    return (
        <div
            className={buildVideoCardClass(showActions)}
            onClick={handleCardClick}
            style={{ '--vc-color': palette.color, '--vc-bg': palette.bg, '--vc-index': index ?? 0 } as React.CSSProperties}
        >
            <div className="video-card__thumb">
                <img
                    className="video-card__thumb-img"
                    src={video.thumbnail}
                    alt={video.title}
                    loading="lazy"
                    onLoad={() => setThumbLoaded(true)}
                    style={{ opacity: thumbLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
                />
                <div className="video-card__play-overlay" aria-hidden="true">
                    <svg className="video-card__play-icon" viewBox="0 0 24 24" fill="white">
                        <polygon points="6,3 20,12 6,21" />
                    </svg>
                </div>
                {isScheduledAndFuture && (
                    <div className="video-card__badge-overlay">
                        <Badge variant="warning">{t('video.scheduled')}</Badge>
                    </div>
                )}
                {isNew && !isScheduledAndFuture && (
                    <div className="video-card__new-overlay">
                        <Badge variant="success">{t('video.new')}</Badge>
                    </div>
                )}
                {isWatched && (
                    <div className="video-card__watched-overlay">
                        <CheckCircle2 size={12} />
                        {t('video.watched')}
                    </div>
                )}
                {hasProgress && (
                    <div className="video-card__progress-bar">
                        <div
                            className="video-card__progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            <div className="video-card__body">
                <p className="video-card__title">{video.title}</p>

                <div className="video-card__meta">
                    <span
                        className="video-card__meta-channel"
                        role="button"
                        onClick={handleChannelClick}
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
                    {visibleTags.map(tag => {
                        const tagPalette = TagColors.palette(tag);
                        return (
                            <span
                                key={tag}
                                className="video-card__tag video-card__tag--clickable"
                                style={{ background: tagPalette.bg, color: tagPalette.color }}
                                role="button"
                                onClick={e => handleTagClick(e, tag)}
                            >
                                {tag}
                            </span>
                        );
                    })}
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
        </div>
    );
}
