import { memo, useRef, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pin, PinOff, Bookmark, BookmarkCheck, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { domain } from '@domain';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { selectWatchLaterIds } from '@store/playlistSlice';
import { analytics, toVuid, AnalyticsSource } from '@api';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import SavePopover from './savePopover';
import TagBadge from '@components/tag/badge';
import VideoStatusBadges from './statusBadges';
import './card.css';
import { useMediaQuery, useTrackImpression } from '@hooks';
import { ROUTES, videoUrl, Format, getVisibleTags, TagColors, getSessionId, formatDuration, formatRelativeDate, cn } from '@utils';
import type { Video, Tag, VideoId } from '@models';

interface VideoCardProps {
    video: Video
    showActions?: boolean
    index?: number
    source?: AnalyticsSource
    onEdit?: (video: Video) => void
    onDelete?: (id: VideoId) => void
}

function buildVideoCardClass(showActions: boolean, notInteractive: boolean) {
    return ['video-card', showActions ? 'video-card--with-actions' : '', notInteractive ? 'video-card--not-interactive' : '']
        .filter(Boolean)
        .join(' ');
}

// eslint-disable-next-line complexity
const VideoCard = memo(function VideoCard({
    video,
    showActions = false,
    index = -1,
    source = AnalyticsSource.HOME,
    onEdit,
    onDelete,
}: VideoCardProps) {
    const isPriority = index === 0;
    const navigate = useNavigate();
    const cardRef = useRef<HTMLElement>(null);
    const vuid = toVuid(video.id);
    const hasValidVuid = vuid !== undefined && vuid !== '';

    useTrackImpression(cardRef, vuid, source, { enabled: hasValidVuid });
    const { t, i18n } = useTranslation();
    const dispatch = useAppDispatch();
    const progress = useAppSelector(s => s.video.videoProgress[video.id] ?? 0);
    const isPinned = useAppSelector(s => s.video.pinnedVideoId === video.id);
    const watchLaterIds = useAppSelector(selectWatchLaterIds);
    const isSaved = watchLaterIds.has(video.id);

    const palette = TagColors.palette(video.tags[0] ?? video.id);
    const { visible: visibleTags, extra: extraTagCount } = getVisibleTags(video.tags);
    const hasExtraTags = extraTagCount > 0;

    const hasProgress = domain.video.hasActiveProgress(progress);
    const isWatched = domain.video.isWatched(progress);

    const isScheduledAndFuture = domain.video.isScheduledAndFuture(video);

    const isVideoProcessing = domain.video.isProcessing(video);
    const isVideoFailed = domain.video.isFailed(video);

    const [thumbLoaded, setThumbLoaded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const isTouchDevice = useMediaQuery('(hover: none)');

    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [menuOpen]);

    function handlePin(e: React.MouseEvent) {
        e.stopPropagation();
        dispatch(videoActions.pinVideo(video.id));
    }

    function trackClick() {
        if (!hasValidVuid) {
            return;
        }
        analytics.click({
            vuid,
            source,
            position: index >= 0 ? index : undefined,
            sessionId: getSessionId(),
        }).catch(() => {});
    }

    const isNotInteractive = isVideoProcessing || isVideoFailed;

    function handleCardClick() {
        if (isNotInteractive) {
            return;
        }
        trackClick();
        navigate(videoUrl(video.id));
    }

    function handleCardKeyDown(e: React.KeyboardEvent) {
        if (isNotInteractive) {
            return;
        }
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) {
            return;
        }

        e.preventDefault();
        trackClick();
        navigate(videoUrl(video.id));
    }

    function handleChannelLinkClick(e: React.MouseEvent) {
        e.stopPropagation();
    }

    function handleEdit(e: React.MouseEvent) {
        e.stopPropagation();
        onEdit?.(video);
    }

    function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        onDelete?.(video.id);
    }

    function handleThumbLoad() {
        setThumbLoaded(true);
    }

    function handleSaveTriggerClick(e: React.MouseEvent) {
        e.stopPropagation();
    }

    function handleTagClick(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) {
        e.stopPropagation();
        dispatch(videoActions.openTagView({ tag, fromVideoId: video.id }));
    }

    return (
        <article
            ref={cardRef}
            className={buildVideoCardClass(showActions, isNotInteractive)}
            tabIndex={isNotInteractive ? -1 : 0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            style={{ '--vc-color': palette.color, '--vc-bg': palette.bg } as React.CSSProperties}
        >
            <div className="video-card__thumb">
                <img
                    className="video-card__thumb-img"
                    src={video.thumbnail}
                    alt={video.title}
                    loading={isPriority ? 'eager' : 'lazy'}
                    fetchPriority={isPriority ? 'high' : 'auto'}
                    decoding={isPriority ? 'sync' : 'async'}
                    onLoad={handleThumbLoad}
                    style={{ opacity: isPriority || thumbLoaded ? 1 : 0, transition: isPriority ? undefined : 'opacity 0.3s ease' }}
                />
                <div className="video-card__play-overlay" aria-hidden="true">
                    <svg className="video-card__play-icon" viewBox="0 0 24 24" fill="white">
                        <polygon points="6,3 20,12 6,21" />
                    </svg>
                </div>
                <VideoStatusBadges
                    isScheduledAndFuture={isScheduledAndFuture}
                    isWatched={isWatched}
                    isProcessing={isVideoProcessing}
                    isFailed={isVideoFailed}
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
                        {formatDuration(video.duration)}
                    </div>
                )}
                <div
                    className={cn('video-card__save-trigger', isTouchDevice && 'video-card__save-trigger--touch')}
                    onClick={handleSaveTriggerClick}
                >
                    <SavePopover videoId={video.id}>
                        <Tooltip content={t('video.save')} side="top">
                            <Button
                                size="icon"
                                variant="ghost"
                                aria-label={t('video.save')}
                                aria-pressed={isSaved}
                                className={cn('video-card__save-btn', isSaved && 'video-card__save-btn--active')}
                            >
                                {isSaved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                            </Button>
                        </Tooltip>
                    </SavePopover>
                </div>

            </div>

            {showActions && (
                <div
                    className={cn('video-card__menu-wrap', menuOpen && 'video-card__menu-wrap--open')}
                    ref={menuRef}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        className="video-card__menu-trigger"
                        onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
                        aria-label="Actions"
                        aria-expanded={menuOpen}
                    >
                        <MoreHorizontal size={13} />
                    </button>
                    {menuOpen && (
                        <div className="video-card__menu-popup" role="menu">
                            <button
                                className="video-card__menu-item"
                                role="menuitem"
                                onClick={() => { dispatch(videoActions.pinVideo(video.id)); setMenuOpen(false); }}
                            >
                                {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                                <span>{t(isPinned ? 'video.unpin' : 'video.pin')}</span>
                            </button>
                            <button
                                className="video-card__menu-item"
                                role="menuitem"
                                onClick={() => { onEdit?.(video); setMenuOpen(false); }}
                            >
                                <Pencil size={12} />
                                <span>{t('video.edit')}</span>
                            </button>
                            <hr className="video-card__menu-divider" aria-hidden="true" />
                            <button
                                className="video-card__menu-item video-card__menu-item--danger"
                                role="menuitem"
                                onClick={() => { onDelete?.(video.id); setMenuOpen(false); }}
                            >
                                <Trash2 size={12} />
                                <span>{t('video.delete')}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="video-card__body">
                <p className="video-card__title">{video.title}</p>

                <div className="video-card__meta">
                    <Link
                        to={ROUTES.CHANNEL.replace(':id', video.channelId)}
                        className="video-card__meta-channel"
                        onClick={handleChannelLinkClick}
                    >
                        {video.channel}
                    </Link>
                    <div className="video-card__meta-sub">
                        <span className="video-card__meta-views">{Format.views(video.views)} {t('video.views')}</span>
                        <span className="video-card__meta-dot" aria-hidden="true">·</span>
                        <span className="video-card__meta-date">{formatRelativeDate(video.publishedAt ?? video.createdAt, i18n.language)}</span>
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

            </div>
        </article>
    );
});

export default VideoCard;
