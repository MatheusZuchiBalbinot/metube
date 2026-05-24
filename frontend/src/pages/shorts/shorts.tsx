import { memo, useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clapperboard, ThumbsUp, ThumbsDown, Bookmark, Volume1, Volume2, VolumeX, ChevronDown, Info, X } from 'lucide-react';
import ReactionBtn from '@components/video/reactionBtn';
import SavePopover from '@components/video/savePopover';
import ShortPlayer from '@components/player/playerShort';
import { Avatar, Tooltip } from '@ui';
import TagBadge from '@components/tag/badge';
import type { Tag } from '@models';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { selectWatchLaterIds } from '@store/playlistSlice';
import { video as videoApi, toVuid } from '@api';
import './shorts.css';
import { ReactionType } from '@enums/reactionType';
import { useVideo, useBurstAnimation } from '@hooks';
import { Format, ROUTES, hasViewed, markViewed, formatRelativeDate, cn } from '@utils';

const MAX_TAGS = 3;

interface ShortItemProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    index: number;
    total: number;
    isActive: boolean;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    onVideoMounted: (el: HTMLVideoElement | null) => void;
    onEnded: () => void;
    onScrollNext: () => void;
    // Lifted volume/mute state — persists across short items
    muted: boolean;
    volume: number;
    watchLaterIds: Set<string>;
    onMuteChange: (muted: boolean) => void;
    onVolumeChange: (volume: number) => void;
}

interface ShortOverlayProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    visibleTags: Tag[];
    onTagClick: (e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => void;
    onChannelClick: (e: React.MouseEvent) => void;
}

function ShortOverlay({ video, visibleTags, onTagClick, onChannelClick }: ShortOverlayProps) {
    return (
        <div className="shorts-page__overlay">
            <button
                className="shorts-page__channel"
                onClick={onChannelClick}
                aria-label={video.channel}
            >
                <Avatar name={video.channel} size="sm" />
                <span className="shorts-page__channel-name">{video.channel}</span>
                <span className="shorts-page__views">{Format.views(video.views)} views</span>
            </button>

            <p className="shorts-page__title">{video.title}</p>

            {visibleTags.length > 0 && (
                <div className="shorts-page__tags">
                    {visibleTags.map(tag => (
                        <TagBadge
                            key={tag}
                            tag={tag}
                            prefix="#"
                            className="shorts-page__tag"
                            onClick={(e: React.MouseEvent | React.KeyboardEvent) => onTagClick(e, tag)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface ShortDescriptionProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    visibleTags: Tag[];
    isOpen: boolean;
    onClose: (e: React.MouseEvent) => void;
    onTagClick: (e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => void;
    onChannelClick: (e: React.MouseEvent) => void;
}

function ShortDescription({ video, visibleTags, isOpen, onClose, onTagClick, onChannelClick }: ShortDescriptionProps) {
    const { t } = useTranslation();
    return (
        <div
            className={cn('shorts-page__desc-panel', isOpen && 'shorts-page__desc-panel--open')}
            role="dialog"
            aria-label={t('shorts.description')}
        >
            <div className="shorts-page__desc-header">
                <span className="shorts-page__desc-title">{t('shorts.description')}</span>
                <button
                    className="shorts-page__desc-close"
                    aria-label={t('common.close')}
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>
            <div className="shorts-page__desc-body">
                <button
                    className="shorts-page__desc-channel"
                    onClick={onChannelClick}
                    aria-label={video.channel}
                >
                    <Avatar name={video.channel} size="sm" />
                    <span>{video.channel}</span>
                </button>
                <p className="shorts-page__desc-video-title">{video.title}</p>
                {video.description && (
                    <p className="shorts-page__desc-text">{video.description}</p>
                )}
                <p className="shorts-page__desc-meta">
                    {Format.views(video.views)} views · {formatRelativeDate(video.publishedAt, 'en')}
                </p>
                {visibleTags.length > 0 && (
                    <div className="shorts-page__tags">
                        {visibleTags.map(tag => (
                            <TagBadge
                                key={tag}
                                tag={tag}
                                prefix="#"
                                className="shorts-page__tag"
                                onClick={(e: React.MouseEvent | React.KeyboardEvent) => onTagClick(e, tag)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// eslint-disable-next-line complexity
const ShortItem = memo(function ShortItem({
    video, index, total, isActive, videoRef, onVideoMounted,
    onEnded, onScrollNext,
    muted, volume, onMuteChange, onVolumeChange, watchLaterIds,
}: ShortItemProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { likedVideos, dislikedVideos, likeVideo, dislikeVideo, openTagView } = useVideo();

    const [likeAnimating, triggerLikeAnimation] = useBurstAnimation();
    const [dislikeAnimating, triggerDislikeAnimation] = useBurstAnimation();
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showDescription, setShowDescription] = useState(false);

    // Derived state
    const isLiked = likedVideos.has(video.id);
    const isDisliked = dislikedVideos.has(video.id);
    const isSaved = watchLaterIds.has(video.id);
    const isLast = index === total - 1;
    const effectiveVolume = muted ? 0 : volume;

    // Event handlers - grouped by type
    function handleVolumeToggle(e: React.MouseEvent) {
        e.stopPropagation();
        setShowVolumeSlider(v => !v);
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        e.stopPropagation();
        const val = parseFloat(e.target.value);
        const el = videoRef.current;
        const nextMuted = val === 0;
        if (el) {
            el.volume = val === 0 ? 0 : val;
            el.muted = nextMuted;
        }

        if (val > 0) {
            onVolumeChange(val);
        }
        onMuteChange(nextMuted);
    }

    function handleReaction(action: ReactionType) {
        switch (action) {
            case ReactionType.LIKE:
                likeVideo(video.id);
                triggerLikeAnimation();
                break;
            case ReactionType.DISLIKE:
                dislikeVideo(video.id);
                triggerDislikeAnimation();
                break;
        }
    }

    function handleNavigation(dest: 'channel' | 'tag', value: string | Tag) {
        if (dest === 'channel') {
            navigate(ROUTES.CHANNEL.replace(':id', value as string));
        } else if (dest === 'tag') {
            openTagView(value as Tag, video.id);
        }
    }

    function handlePanelToggle(e: React.MouseEvent | React.KeyboardEvent, panel: 'volume' | 'description') {
        if (e) {
            e.stopPropagation();
        }

        if (panel === 'volume') {
            setShowVolumeSlider(v => !v);
        } else {
            setShowDescription(v => !v);
        }
    }

    // Tap closes side panels
    function handleTap() {
        setShowVolumeSlider(false);
        setShowDescription(false);
    }

    // Escape key closes description panel
    useEffect(() => {
        if (!showDescription) {
            return;
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setShowDescription(false);
            }
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [showDescription]);

    const visibleTags = video.tags.filter(tag => tag !== 'shorts').slice(0, MAX_TAGS);
    const volumeFill = `${effectiveVolume * 100}%`;

    let volumeIcon;
    if (effectiveVolume === 0) {
        volumeIcon = <VolumeX size={20} strokeWidth={1.75} />;
    } else if (effectiveVolume < 0.5) {
        volumeIcon = <Volume1 size={20} strokeWidth={1.75} />;
    } else {
        volumeIcon = <Volume2 size={20} strokeWidth={1.75} />;
    }

    return (
        <div className="shorts-page__item">
            {/* Portrait stage — constrained to portrait width */}
            <div className="shorts-page__stage">
                <ShortPlayer
                    videoRef={videoRef}
                    src={video.videoUrl ?? ''}
                    captureKeyboard={isActive}
                    controlledMuted={muted}
                    controlledVolume={volume}
                    onMuteChange={onMuteChange}
                    onVolumeChange={onVolumeChange}
                    onVideoMounted={onVideoMounted}
                    onEnded={onEnded}
                    onTap={handleTap}
                >
                    {/* Counter */}
                    <span className="shorts-page__counter">
                        {t('shorts.counter', { current: index + 1, total })}
                    </span>

                    {/* Bottom overlay */}
                    <ShortOverlay
                        video={video}
                        visibleTags={visibleTags}
                        onTagClick={(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => {
                            e.stopPropagation();
                            handleNavigation('tag', tag);
                        }}
                        onChannelClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleNavigation('channel', video.channelId);
                        }}
                    />

                    {/* Description overlay panel */}
                    <ShortDescription
                        video={video}
                        visibleTags={visibleTags}
                        isOpen={showDescription}
                        onClose={e => handlePanelToggle(e, 'description')}
                        onTagClick={(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => {
                            e.stopPropagation();
                            handleNavigation('tag', tag);
                        }}
                        onChannelClick={(e: React.MouseEvent) => {
                            e.stopPropagation();
                            handleNavigation('channel', video.channelId);
                        }}
                    />

                    {/* Scroll hint on first short */}
                    {index === 0 && (
                        <div className="shorts-page__scroll-hint" aria-hidden>
                            <ChevronDown size={18} />
                        </div>
                    )}
                </ShortPlayer>
            </div>{/* .shorts-page__stage */}

            {/* Side action panel — outside the stage */}
            <div className="shorts-page__side">
                <ReactionBtn
                    isActive={isLiked}
                    isAnimating={likeAnimating}
                    icon={<ThumbsUp size={22} strokeWidth={1.75} fill="none" />}
                    iconActive={<ThumbsUp size={22} strokeWidth={1.75} fill="currentColor" />}
                    label={t('video.like')}
                    activeLabel={t('video.liked')}
                    className="shorts-page__action"
                    activeClass="shorts-page__action--liked"
                    tooltipSide="right"
                    onClick={() => handleReaction(ReactionType.LIKE)}
                />

                <ReactionBtn
                    isActive={isDisliked}
                    isAnimating={dislikeAnimating}
                    icon={<ThumbsDown size={22} strokeWidth={1.75} fill="none" />}
                    iconActive={<ThumbsDown size={22} strokeWidth={1.75} fill="currentColor" />}
                    label={t('video.dislike')}
                    activeLabel={t('video.disliked')}
                    className="shorts-page__action"
                    activeClass="shorts-page__action--disliked"
                    tooltipSide="right"
                    onClick={() => handleReaction(ReactionType.DISLIKE)}
                />

                <SavePopover videoId={video.id}>
                    <ReactionBtn
                        isActive={isSaved}
                        icon={<Bookmark size={22} strokeWidth={1.75} fill="none" />}
                        iconActive={<Bookmark size={22} strokeWidth={1.75} fill="currentColor" />}
                        label={t('video.save')}
                        activeLabel={t('video.saved')}
                        className="shorts-page__action"
                        activeClass="shorts-page__action--saved"
                        tooltipSide="right"
                        onClick={() => { }}
                    />
                </SavePopover>

                {/* Description button */}
                <Tooltip content={t('shorts.description')} side="right">
                    <button
                        className={cn('shorts-page__action', showDescription && 'shorts-page__action--active')}
                        aria-label={t('shorts.description')}
                        aria-pressed={showDescription}
                        onClick={e => handlePanelToggle(e, 'description')}
                    >
                        <span className="rbtn__icon">
                            <Info size={22} strokeWidth={1.75} />
                        </span>
                        <span className="rbtn__label">{t('shorts.description')}</span>
                    </button>
                </Tooltip>

                {/* Volume control: icon toggles slider visibility */}
                <div className="shorts-page__volume">
                    <Tooltip content={muted ? t('shorts.unmute') : t('shorts.mute')} side="right">
                        <button
                            className="shorts-page__action"
                            aria-label={muted ? t('shorts.unmute') : t('shorts.mute')}
                            onClick={handleVolumeToggle}
                        >
                            <span className="rbtn__icon">
                                {volumeIcon}
                            </span>
                        </button>
                    </Tooltip>
                    <div className={cn('shorts-page__volume-slider-wrap', showVolumeSlider && 'shorts-page__volume-slider-wrap--open')}>
                        <input
                            type="range"
                            className="shorts-page__volume-slider"
                            min={0}
                            max={1}
                            step={0.02}
                            value={effectiveVolume}
                            onChange={handleVolumeChange}
                            onClick={e => e.stopPropagation()}
                            aria-label={t('shorts.volume')}
                            style={{
                                background: `linear-gradient(to top, rgba(255,255,255,0.9) ${volumeFill}, rgba(255,255,255,0.2) ${volumeFill})`,
                            }}
                        />
                    </div>
                </div>

                {!isLast && (
                    <Tooltip content={t('shorts.next')} side="right">
                        <button
                            className="shorts-page__nav-btn"
                            aria-label={t('shorts.next')}
                            onClick={e => {
                                e.stopPropagation(); onScrollNext();
                            }}
                        >
                            <ChevronDown size={20} strokeWidth={2} />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
});

export default function ShortsPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const {
        publishedVideos, watchVideo, closeMiniPlayer,
        shortsMuted: muted, shortsVolume: volume,
        setShortsMuted: setMuted, setShortsVolume: setVolume,
    } = useVideo();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);
    const feedRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
    const videoRefsMap = useRef<Map<number, HTMLVideoElement>>(new Map());
    const [activeIndex, setActiveIndex] = useState(0);
    const activeIndexRef = useRef(0);

    // Close mini player when shorts page opens
    useEffect(() => {
        closeMiniPlayer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const shorts = useMemo(
        () => publishedVideos.filter(v => v.tags.includes('shorts' as Tag)),
        [publishedVideos],
    );

    // One stable ref per short item, created once
    const videoRefsArray = useRef<React.RefObject<HTMLVideoElement | null>[]>([]);

    // Ensure we have enough refs for the current shorts list
    useLayoutEffect(() => {
        while (videoRefsArray.current.length < shorts.length) {
            videoRefsArray.current.push({ current: null });
        }
    }, [shorts.length]);

    function handleVideoMounted(index: number, el: HTMLVideoElement | null) {
        const isRemoving = el === null;
        if (isRemoving) {
            videoRefsMap.current.delete(index);
            return;
        }
        videoRefsMap.current.set(index, el);
    }

    const activateIndex = useCallback((newIndex: number) => {
        const isAlreadyActive = newIndex === activeIndexRef.current;
        const isPlaying = !(videoRefsMap.current.get(newIndex)?.paused ?? true);
        if (isAlreadyActive && isPlaying) {
            return;
        }

        videoRefsMap.current.forEach((el, i) => {
            const isCurrent = i === newIndex;
            if (isCurrent) {
                el.currentTime = 0;
                el.play().catch(() => undefined);
            } else {
                el.pause();
            }
        });

        const shortId = shorts[newIndex]?.id;
        const hasId = shortId !== undefined;
        if (hasId) {
            watchVideo(shortId);
            if (!hasViewed(shortId)) {
                markViewed(shortId);
                videoApi.recordView(toVuid(shortId));
                dispatch(videoActions.incrementViews(shortId));
            }
        }

        setActiveIndex(newIndex);
        activeIndexRef.current = newIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shorts.length]);

    const scrollToIndex = useCallback((index: number) => {
        const isOutOfBounds = index < 0 || index >= shorts.length;
        if (isOutOfBounds) {
            return;
        }
        itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
    }, [shorts.length]);

    useEffect(() => {
        const feed = feedRef.current;
        const isNoShorts = shorts.length === 0;
        if (!feed || isNoShorts) {
            return;
        }

        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    const isVisible = entry.intersectionRatio >= 0.6;
                    if (!isVisible) {
                        continue;
                    }
                    const idx = itemRefs.current.indexOf(entry.target as HTMLDivElement);
                    const isValidIndex = idx !== -1;
                    if (isValidIndex) {
                        activateIndex(idx);
                    }
                }
            },
            { root: feed, threshold: 0.6 },
        );

        itemRefs.current.forEach(el => {
            const isMounted = el !== null;
            if (isMounted) {
                observer.observe(el);
            }
        });

        return () => observer.disconnect();
    }, [shorts.length, activateIndex]);

    // Silence unused variable warning — activeIndex drives side effects, not rendering directly
    void activeIndex;

    const isEmpty = shorts.length === 0;

    if (isEmpty) {
        return (
            <div className="shorts-page">
                <div className="shorts-page__empty">
                    <Clapperboard size={48} className="shorts-page__empty-icon" />
                    <p className="shorts-page__empty-title">{t('shorts.empty_title')}</p>
                    <p className="shorts-page__empty-desc">{t('shorts.empty_desc')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="shorts-page">
            <div className="shorts-page__feed" ref={feedRef}>
                {shorts.map((video, index) => {
                    // Ensure ref slot exists
                    if (!videoRefsArray.current[index]) {
                        videoRefsArray.current[index] = { current: null };
                    }
                    const isWithinWindow = Math.abs(index - activeIndex) <= 2;
                    return (
                        <div
                            key={video.id}
                            ref={el => {
                                itemRefs.current[index] = el;
                            }}
                            style={{ height: '100%' }}
                        >
                            {isWithinWindow && (
                                <ShortItem
                                    video={video}
                                    index={index}
                                    total={shorts.length}
                                    isActive={index === activeIndex}
                                    videoRef={videoRefsArray.current[index]}
                                    onVideoMounted={el => handleVideoMounted(index, el)}
                                    onEnded={() => scrollToIndex(index + 1)}
                                    onScrollNext={() => scrollToIndex(index + 1)}
                                    muted={muted}
                                    volume={volume}
                                    onMuteChange={setMuted}
                                    onVolumeChange={setVolume}
                                    watchLaterIds={watchLaterIds}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
