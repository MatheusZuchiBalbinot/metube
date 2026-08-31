import { memo, useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pin, PinOff, Bookmark, BookmarkCheck, MoreHorizontal, Pencil, Trash2, RotateCw } from 'lucide-react';
import { domain } from '@domain';
import { useAppDispatch, useAppSelector } from '@store';
import { videoUiActions } from '@store/videoUiSlice';
import { playbackActions } from '@store/playbackSlice';
import { selectWatchLaterIds } from '@store/playlistSelectors';
import { toVuid, AnalyticsSource } from '@api';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import SavePopover from './savePopover';
import TagBadge from '@components/tag/badge';
import VideoStatusBadges from './statusBadges';
import VideoMeta from './videoMeta';
import './card.css';
import { useMediaQuery, useTrackImpression, useClickOutside, useVideoClickTracking } from '@hooks';
import { videoUrl, getVisibleTags, TagColors, formatDuration, isActivationKey, cn } from '@utils';
import type { Video, Tag, VideoId } from '@models';

interface VideoCardProps {
    video: Video
    showActions?: boolean
    index?: number
    source?: AnalyticsSource
    onEdit?: (video: Video) => void
    onDelete?: (id: VideoId) => void
    onRetry?: () => void
}

function buildVideoCardClass(showActions: boolean, notInteractive: boolean) {
    return ['video-card', showActions ? 'video-card--with-actions' : '', notInteractive ? 'video-card--not-interactive' : '']
        .filter(Boolean)
        .join(' ');
}

const PREVIEW_DELAY_MS = 500;

// Inherent branching of a rich presentational card (thumbnail/preview, progress, duration,
// status badges, save/pin/menu actions, tag overflow); interactive logic already lives in
// the handleX functions and hooks above — same rationale as playlist/card.tsx.
// eslint-disable-next-line complexity
const VideoCard = memo(function VideoCard({
    video,
    showActions = false,
    index = -1,
    source = AnalyticsSource.HOME,
    onEdit,
    onDelete,
    onRetry,
}: VideoCardProps) {
    const isPriority = index === 0;
    const navigate = useNavigate();
    const cardRef = useRef<HTMLElement>(null);
    const vuid = toVuid(video.id);
    const hasValidVuid = vuid !== undefined && vuid !== '';

    useTrackImpression(cardRef, vuid, source, { enabled: hasValidVuid });
    const trackClick = useVideoClickTracking(video.id, source);
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const progress = useAppSelector(s => s.video.videoProgress[video.id] ?? 0);
    const isPinned = useAppSelector(s => s.playback.pinnedVideoId === video.id);
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
    const isVideoDraft = domain.video.isDraft(video);

    const [thumbLoaded, setThumbLoaded] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [previewActive, setPreviewActive] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTouchDevice = useMediaQuery('(hover: none)');
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

    useClickOutside(menuRef, () => setMenuOpen(false), menuOpen);

    const isNotInteractive = isVideoProcessing || isVideoFailed;
    const hasPreviewSource = (video.videoUrl ?? '') !== '';
    const canPreview = !isTouchDevice && !prefersReducedMotion && !isNotInteractive && hasPreviewSource;

    useEffect(() => () => {
        if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current);
        }
    }, []);

    function handleMouseEnter() {
        if (!canPreview) {
            return;
        }
        previewTimerRef.current = setTimeout(() => setPreviewActive(true), PREVIEW_DELAY_MS);
    }

    function handleMouseLeave() {
        if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current);
            previewTimerRef.current = null;
        }
        setPreviewActive(false);
    }

    function handleCardClick() {
        if (isNotInteractive) {
            return;
        }
        trackClick(index >= 0 ? index : undefined);
        navigate(videoUrl(video.id));
    }

    function handleCardKeyDown(e: React.KeyboardEvent) {
        if (isNotInteractive) {
            return;
        }

        if (!isActivationKey(e)) {
            return;
        }

        e.preventDefault();
        trackClick(index >= 0 ? index : undefined);
        navigate(videoUrl(video.id));
    }

    function handleThumbLoad() {
        setThumbLoaded(true);
    }

    function handleSaveTriggerClick(e: React.MouseEvent) {
        e.stopPropagation();
    }

    function handleTagClick(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) {
        e.stopPropagation();
        dispatch(videoUiActions.openTagView({ tag, fromVideoId: video.id }));
    }

    return (
        <article
            ref={cardRef}
            className={buildVideoCardClass(showActions, isNotInteractive)}
            role="button"
            aria-label={video.title}
            tabIndex={isNotInteractive ? -1 : 0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ '--vc-color': palette.color, '--vc-bg': palette.bg } as React.CSSProperties}
        >
            <div className={cn('video-card__thumb', !thumbLoaded && !isPriority && 'video-card__thumb--loading')}>
                {/* onLoad drives the lazy-load fade-in; it is a resource-load event, not a user interaction. */}
                {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
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
                {previewActive && (
                    <video
                        className="video-card__preview"
                        src={video.videoUrl}
                        muted
                        playsInline
                        autoPlay
                        loop
                        preload="metadata"
                        aria-hidden="true"
                    />
                )}
                <div className="video-card__play-overlay" aria-hidden="true">
                    <svg className="video-card__play-icon" viewBox="0 0 24 24" fill="white">
                        <polygon points="6,3 20,12 6,21" />
                    </svg>
                </div>
                <VideoStatusBadges
                    isDraft={isVideoDraft}
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
                {/* Wrapper only stops the click from bubbling to the card; the Save control inside is a real button. */}
                {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
                <div
                    className={cn('video-card__save-trigger', isTouchDevice && 'video-card__save-trigger--touch')}
                    onClick={handleSaveTriggerClick}
                >
                    <SavePopover videoId={video.id}>
                        <Tooltip content={t('video.save')} side="top">
                            <Button
                                size="icon"
                                variant="overlay"
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

            <div className="video-card__body">
                <div className="video-card__title-row">
                    <p className="video-card__title">{video.title}</p>

                    {showActions && (
                        // Wrapper only stops the click from bubbling to the card; the menu items inside are real buttons.
                        // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
                        <div
                            className={cn('video-card__menu-wrap', menuOpen && 'video-card__menu-wrap--open')}
                            ref={menuRef}
                            onClick={e => e.stopPropagation()}
                        >
                            <button
                                className="video-card__menu-trigger"
                                onClick={e => {
                                    e.stopPropagation(); setMenuOpen(v => !v);
                                }}
                                aria-label={t('video.actions')}
                                aria-expanded={menuOpen}
                            >
                                <MoreHorizontal size={13} />
                            </button>
                            {menuOpen && (
                                <div className="video-card__menu-popup" role="menu">
                                    {isVideoFailed ? (
                                        <button
                                            className="video-card__menu-item"
                                            role="menuitem"
                                            onClick={() => {
                                                onRetry?.(); setMenuOpen(false);
                                            }}
                                        >
                                            <RotateCw size={12} />
                                            <span>{t('video.retry_upload')}</span>
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                className="video-card__menu-item"
                                                role="menuitem"
                                                onClick={() => {
                                                    dispatch(playbackActions.pinVideo(video.id)); setMenuOpen(false);
                                                }}
                                            >
                                                {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                                                <span>{t(isPinned ? 'video.unpin' : 'video.pin')}</span>
                                            </button>
                                            <button
                                                className="video-card__menu-item"
                                                role="menuitem"
                                                onClick={() => {
                                                    onEdit?.(video); setMenuOpen(false);
                                                }}
                                            >
                                                <Pencil size={12} />
                                                <span>{t('video.edit')}</span>
                                            </button>
                                        </>
                                    )}
                                    <hr className="video-card__menu-divider" aria-hidden="true" />
                                    <button
                                        className="video-card__menu-item video-card__menu-item--danger"
                                        role="menuitem"
                                        onClick={() => {
                                            onDelete?.(video.id); setMenuOpen(false);
                                        }}
                                    >
                                        <Trash2 size={12} />
                                        <span>{t('video.delete')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <VideoMeta video={video} variant="card" />

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
