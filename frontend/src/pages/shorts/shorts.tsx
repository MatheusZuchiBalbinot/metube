import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clapperboard, ThumbsUp, ThumbsDown, Bookmark, Volume1, Volume2, VolumeX, ChevronDown, Info, X } from 'lucide-react';
import VideoPlayer from '@components/video/player';
import { useVideo } from '@context/useVideo';
import { Avatar, Tooltip } from '@ui';
import { TagColors } from '@utils/tagColors';
import { Format } from '@utils/format';
import { ROUTES } from '@utils/routes';
import './shorts.css';

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
    onMuteChange: (muted: boolean) => void;
    onVolumeChange: (volume: number) => void;
}

function ShortItem({
    video, index, total, isActive, videoRef, onVideoMounted,
    onEnded, onScrollNext,
    muted, volume, onMuteChange, onVolumeChange,
}: ShortItemProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { likedVideos, dislikedVideos, savedVideos, likeVideo, dislikeVideo, saveVideo, openTagView } = useVideo();

    const [likeAnimating, setLikeAnimating] = useState(false);
    const [dislikeAnimating, setDislikeAnimating] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [showDescription, setShowDescription] = useState(false);

    const isLiked = likedVideos.has(video.id);
    const isDisliked = dislikedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isLast = index === total - 1;
    const effectiveVolume = muted ? 0 : volume;

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
        const shouldUpdateStoredVolume = val > 0;
        if (shouldUpdateStoredVolume) { onVolumeChange(val); }
        onMuteChange(nextMuted);
    }

    function handleLike(e: React.MouseEvent) {
        e.stopPropagation();
        likeVideo(video.id);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);
    }

    function handleDislike(e: React.MouseEvent) {
        e.stopPropagation();
        dislikeVideo(video.id);
        setDislikeAnimating(true);
        setTimeout(() => setDislikeAnimating(false), 400);
    }

    function handleSave(e: React.MouseEvent) {
        e.stopPropagation();
        saveVideo(video.id);
    }

    function handleTagClick(e: React.MouseEvent, tag: string) {
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    function handleChannelClick(e: React.MouseEvent) {
        e.stopPropagation();
        navigate(ROUTES.CHANNEL.replace(':id', video.channelId));
    }

    function handleDescriptionToggle(e: React.MouseEvent) {
        e.stopPropagation();
        setShowDescription(v => !v);
    }

    // Called by VideoPlayer when the tap overlay is clicked — close side panels
    function handleTap() {
        setShowVolumeSlider(false);
        setShowDescription(false);
    }

    const visibleTags = video.tags.filter(tag => tag !== 'shorts').slice(0, MAX_TAGS);
    const volumeFill = `${effectiveVolume * 100}%`;

    return (
        <div className="shorts-page__item">
            {/* Portrait stage — constrained to portrait width */}
            <div className="shorts-page__stage">
            <VideoPlayer
                mode="short"
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
                <div className="shorts-page__overlay">
                    <button
                        className="shorts-page__channel"
                        onClick={handleChannelClick}
                        aria-label={video.channel}
                    >
                        <Avatar name={video.channel} size="sm" />
                        <span className="shorts-page__channel-name">{video.channel}</span>
                        <span className="shorts-page__views">{Format.views(video.views)} views</span>
                    </button>

                    <p className="shorts-page__title">{video.title}</p>

                    {visibleTags.length > 0 && (
                        <div className="shorts-page__tags">
                            {visibleTags.map(tag => {
                                const palette = TagColors.palette(tag);
                                return (
                                    <button
                                        key={tag}
                                        className="shorts-page__tag"
                                        style={{ background: palette.bg, color: palette.color }}
                                        onClick={e => handleTagClick(e, tag)}
                                    >
                                        #{tag}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Description overlay panel */}
                <div
                    className={['shorts-page__desc-panel', showDescription ? 'shorts-page__desc-panel--open' : ''].filter(Boolean).join(' ')}
                    role="dialog"
                    aria-label={t('shorts.description')}
                >
                    <div className="shorts-page__desc-header">
                        <span className="shorts-page__desc-title">{t('shorts.description')}</span>
                        <button
                            className="shorts-page__desc-close"
                            aria-label={t('common.close')}
                            onClick={handleDescriptionToggle}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="shorts-page__desc-body">
                        <button
                            className="shorts-page__desc-channel"
                            onClick={handleChannelClick}
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
                            {Format.views(video.views)} views · {Format.relativeDate(video.publishedAt, 'en')}
                        </p>
                        {visibleTags.length > 0 && (
                            <div className="shorts-page__tags">
                                {visibleTags.map(tag => {
                                    const palette = TagColors.palette(tag);
                                    return (
                                        <button
                                            key={tag}
                                            className="shorts-page__tag"
                                            style={{ background: palette.bg, color: palette.color }}
                                            onClick={e => handleTagClick(e, tag)}
                                        >
                                            #{tag}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Scroll hint on first short */}
                {index === 0 && (
                    <div className="shorts-page__scroll-hint" aria-hidden>
                        <ChevronDown size={18} />
                    </div>
                )}
            </VideoPlayer>
            </div>{/* .shorts-page__stage */}

            {/* Side action panel — outside the stage */}
            <div className="shorts-page__side">
                <Tooltip content={isLiked ? t('video.liked') : t('video.like')} side="right">
                    <button
                        className={['shorts-page__action', isLiked ? 'shorts-page__action--liked' : '', likeAnimating ? 'shorts-page__action--burst' : ''].filter(Boolean).join(' ')}
                        aria-label={isLiked ? t('video.liked') : t('video.like')}
                        aria-pressed={isLiked}
                        onClick={handleLike}
                    >
                        <span className="shorts-page__action-icon">
                            <ThumbsUp size={22} strokeWidth={1.75} fill={isLiked ? 'currentColor' : 'none'} />
                        </span>
                        <span className="shorts-page__action-label">{t('video.like')}</span>
                    </button>
                </Tooltip>

                <Tooltip content={isDisliked ? t('video.disliked') : t('video.dislike')} side="right">
                    <button
                        className={['shorts-page__action', isDisliked ? 'shorts-page__action--disliked' : '', dislikeAnimating ? 'shorts-page__action--burst' : ''].filter(Boolean).join(' ')}
                        aria-label={isDisliked ? t('video.disliked') : t('video.dislike')}
                        aria-pressed={isDisliked}
                        onClick={handleDislike}
                    >
                        <span className="shorts-page__action-icon">
                            <ThumbsDown size={22} strokeWidth={1.75} fill={isDisliked ? 'currentColor' : 'none'} />
                        </span>
                        <span className="shorts-page__action-label">{t('video.dislike')}</span>
                    </button>
                </Tooltip>

                <Tooltip content={isSaved ? t('video.saved') : t('video.save')} side="right">
                    <button
                        className={['shorts-page__action', isSaved ? 'shorts-page__action--saved' : ''].filter(Boolean).join(' ')}
                        aria-label={isSaved ? t('video.saved') : t('video.save')}
                        aria-pressed={isSaved}
                        onClick={handleSave}
                    >
                        <span className="shorts-page__action-icon">
                            <Bookmark size={22} strokeWidth={1.75} fill={isSaved ? 'currentColor' : 'none'} />
                        </span>
                        <span className="shorts-page__action-label">{t('video.save')}</span>
                    </button>
                </Tooltip>

                {/* Description button */}
                <Tooltip content={t('shorts.description')} side="right">
                    <button
                        className={['shorts-page__action', showDescription ? 'shorts-page__action--active' : ''].filter(Boolean).join(' ')}
                        aria-label={t('shorts.description')}
                        aria-pressed={showDescription}
                        onClick={handleDescriptionToggle}
                    >
                        <span className="shorts-page__action-icon">
                            <Info size={22} strokeWidth={1.75} />
                        </span>
                        <span className="shorts-page__action-label">{t('shorts.description')}</span>
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
                            <span className="shorts-page__action-icon">
                                {effectiveVolume === 0
                                    ? <VolumeX size={20} strokeWidth={1.75} />
                                    : effectiveVolume < 0.5
                                        ? <Volume1 size={20} strokeWidth={1.75} />
                                        : <Volume2 size={20} strokeWidth={1.75} />
                                }
                            </span>
                        </button>
                    </Tooltip>
                    <div className={['shorts-page__volume-slider-wrap', showVolumeSlider ? 'shorts-page__volume-slider-wrap--open' : ''].filter(Boolean).join(' ')}>
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
                            onClick={e => { e.stopPropagation(); onScrollNext(); }}
                        >
                            <ChevronDown size={20} strokeWidth={2} />
                        </button>
                    </Tooltip>
                )}
            </div>
        </div>
    );
}

export default function ShortsPage() {
    const { t } = useTranslation();
    const {
        publishedVideos, watchVideo, closeMiniPlayer,
        shortsMuted: muted, shortsVolume: volume,
        setShortsMuted: setMuted, setShortsVolume: setVolume,
    } = useVideo();
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

    const shorts = publishedVideos.filter(v => v.tags.includes('shorts'));

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
        if (isAlreadyActive && isPlaying) { return; }

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
        if (hasId) { watchVideo(shortId); }

        setActiveIndex(newIndex);
        activeIndexRef.current = newIndex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shorts.length]);

    const scrollToIndex = useCallback((index: number) => {
        const isOutOfBounds = index < 0 || index >= shorts.length;
        if (isOutOfBounds) { return; }
        itemRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
    }, [shorts.length]);

    useEffect(() => {
        const feed = feedRef.current;
        const isNoShorts = shorts.length === 0;
        if (!feed || isNoShorts) { return; }

        const observer = new IntersectionObserver(
            entries => {
                for (const entry of entries) {
                    const isVisible = entry.intersectionRatio >= 0.6;
                    if (!isVisible) { continue; }
                    const idx = itemRefs.current.indexOf(entry.target as HTMLDivElement);
                    const isValidIndex = idx !== -1;
                    if (isValidIndex) { activateIndex(idx); }
                }
            },
            { root: feed, threshold: 0.6 },
        );

        itemRefs.current.forEach(el => {
            const isMounted = el !== null;
            if (isMounted) { observer.observe(el); }
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
                    return (
                        <div
                            key={video.id}
                            ref={el => { itemRefs.current[index] = el; }}
                            style={{ height: '100%' }}
                        >
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
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
