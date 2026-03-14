import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Bookmark, Link2, VideoOff, ArrowLeft, BookOpen, List, Lightbulb, X } from 'lucide-react';
import VideoPlayer from '@components/video/player';
import VideoCard from '@components/video/card';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import { useVideo } from '@context/useVideo';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { toastActions } from '@store/toastSlice';
import { VideoFilter } from '@utils/applyFilters';
import { Format } from '@utils/format';
import { ROUTES } from '@utils/routes';
import { getVideoSummary } from '@data/mockSummaries';
import { TagColors } from '@utils/tagColors';
import { useKeyboardShortcuts } from '@utils/useKeyboardShortcuts';
import { Button, Tooltip, Badge } from '@ui';
import './video.css';

const AUTOPLAY_COUNTDOWN = 5;
const PROGRESS_THROTTLE_MS = 3000;

// For videos without a real file: simulate progress over time
const SIMULATE_DURATION_S = 60; // treat as a 60-second "video"
const SIMULATE_TICK_MS = 2000; // tick every 2s


type SidebarTab = 'related' | 'summary';

function parseTimestamp(ts: string): number {
    const parts = ts.split(':').map(Number);
    const isHMS = parts.length === 3;
    if (isHMS) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] * 60 + (parts[1] ?? 0);
}

// eslint-disable-next-line complexity
export default function VideoPage() {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {
        videos, likedVideos, dislikedVideos, savedVideos,
        likeVideo, dislikeVideo, saveVideo, watchVideo,
        updateProgress, videoProgress, autoplay, closeMiniPlayer,
        consumePendingVideoSeek,
    } = useVideo();

    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);

    const video = videos.find(v => v.id === id);
    const hasVideo = video !== undefined;

    const registeredRef = useRef(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressThrottleRef = useRef<number>(0);
    const pendingSeekRef = useRef<number | null>(null);
    const simulatedSecondsRef = useRef<number>(0);
    const simulateTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const currentTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const hasCompletedRef = useRef(false);
    const readingContentRef = useRef<HTMLDivElement>(null);

    const [likeAnimating, setLikeAnimating] = useState(false);
    const [dislikeAnimating, setDislikeAnimating] = useState(false);
    const [saveAnimating, setSaveAnimating] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('related');
    const [readingMode, setReadingMode] = useState(false);
    const [autoplayCountdown, setAutoplayCountdown] = useState<number | null>(null);
    const [showCompletion, setShowCompletion] = useState(false);
    const [readingProgress, setReadingProgress] = useState(0);
    const autoplayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reset per-video state when id changes
    useEffect(() => {
        hasCompletedRef.current = false;
        setReadingProgress(0);
    }, [id]);

    useEffect(() => {
        closeMiniPlayer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        const shouldRegister = hasVideo && !registeredRef.current;
        if (!shouldRegister) {
            return;
        }

        registeredRef.current = true;
        watchVideo(id!);
    }, [id, hasVideo, watchVideo]);

    useEffect(() => {
        if (!id) {
            return;
        }

        const resumeTime = consumePendingVideoSeek(id);

        if (resumeTime !== null) {
            pendingSeekRef.current = resumeTime;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const relatedVideos = useMemo(() => {
        const isVideoMissing = !hasVideo;
        if (isVideoMissing) {
            return [];
        }

        const videoTagSet = new Set(video!.tags);
        return videos
            .filter(v => v.id !== video!.id && v.tags.some(t => videoTagSet.has(t)))
            .sort((a, b) => b.views - a.views)
            .slice(0, 10);
    }, [hasVideo, video, videos]);

    const allRelatedTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const v of relatedVideos) {
            for (const tag of v.tags) { tagSet.add(tag); }
        }
        return Array.from(tagSet).sort();
    }, [relatedVideos]);

    const filteredRelated = useMemo(
        () => VideoFilter.apply(relatedVideos, filterState),
        [relatedVideos, filterState],
    );

    const summary = useMemo(() => {
        const isVideoMissing = !hasVideo;
        if (isVideoMissing) {
            return null;
        }

        return getVideoSummary(video!.id);
    }, [hasVideo, video]);

    const hasSummary = summary !== null;

    const readingTime = useMemo(() => {
        const hasSummaryContent = summary !== null;
        if (!hasSummaryContent) {
            return 0;
        }
        const words = summary.readingMode.split(/\s+/).length;
        return Math.max(1, Math.ceil(words / 200));
    }, [summary]);

    function triggerCompletion() {
        const isAlreadyCompleted = hasCompletedRef.current;
        if (isAlreadyCompleted) {
            return;
        }
        hasCompletedRef.current = true;
        setShowCompletion(true);
        setTimeout(() => setShowCompletion(false), 1800);
    }

    function startAutoplayCountdown() {
        const hasRelated = relatedVideos.length > 0;
        if (!autoplay || !hasRelated) {
            return;
        }

        setAutoplayCountdown(AUTOPLAY_COUNTDOWN);
    }

    function cancelAutoplay() {
        setAutoplayCountdown(null);
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }
    }

    useEffect(() => {
        const isCountingDown = autoplayCountdown !== null;
        if (!isCountingDown) {
            return;
        }

        autoplayTimerRef.current = setInterval(() => {
            setAutoplayCountdown(prev => {
                const isAtZero = prev !== null && prev <= 1;
                if (isAtZero) {
                    clearInterval(autoplayTimerRef.current!);
                    autoplayTimerRef.current = null;
                    const nextVideo = relatedVideos[0];
                    if (nextVideo) {
                        navigate(ROUTES.VIDEO.replace(':id', nextVideo.id));
                    }

                    return null;
                }
                return prev !== null ? prev - 1 : null;
            });
        }, 1000);

        return () => {
            if (autoplayTimerRef.current) {
                clearInterval(autoplayTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoplayCountdown]);

    // ─── Simulate progress for no-file videos ─────────────────────────────────
    useEffect(() => {
        const isVideoMissing = !hasVideo || !id;
        if (isVideoMissing) {
            return;
        }

        const hasFile = video!.videoUrl !== undefined && video!.videoUrl !== '';
        if (hasFile) {
            return;
        }

        // Restore existing progress so we continue from where we left off
        const existing = videoProgress[id] ?? 0;
        const isFinished = existing >= 95;
        if (isFinished) {
            return;
        }

        // Start at least 4s into simulation (~7%) so mini-player always triggers on navigate-away
        simulatedSecondsRef.current = Math.max(4, (existing / 100) * SIMULATE_DURATION_S);

        simulateTimerRef.current = setInterval(() => {
            simulatedSecondsRef.current += SIMULATE_TICK_MS / 1000;
            const pct = Math.min((simulatedSecondsRef.current / SIMULATE_DURATION_S) * 100, 100);
            updateProgress(id, pct);

            const isVideoFinished = pct >= 100;
            if (isVideoFinished) {
                clearInterval(simulateTimerRef.current!);
                simulateTimerRef.current = null;
                triggerCompletion();
                startAutoplayCountdown();
            }
        }, SIMULATE_TICK_MS);

        return () => {
            if (simulateTimerRef.current) {
                clearInterval(simulateTimerRef.current);
                simulateTimerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, hasVideo]);

    const handleLoadedMetadata = useCallback(() => {
        const el = videoRef.current;
        if (!el) {
            return;
        }

        durationRef.current = el.duration;

        const hasPendingSeek = pendingSeekRef.current !== null;
        if (hasPendingSeek) {
            el.currentTime = pendingSeekRef.current!;
            pendingSeekRef.current = null;
            el.play().catch(() => { });
        }

        currentTimeRef.current = el.currentTime;

    }, []);

    const handleTimeUpdate = useCallback(() => {
        const el = videoRef.current;
        if (!el || !id) {
            return;
        }

        currentTimeRef.current = el.currentTime;

        const now = Date.now();
        const shouldThrottle = now - progressThrottleRef.current < PROGRESS_THROTTLE_MS;
        if (shouldThrottle) {
            return;
        }

        progressThrottleRef.current = now;
        const percent = el.duration > 0 ? (el.currentTime / el.duration) * 100 : 0;

        updateProgress(id, percent);
    }, [id, updateProgress]);

    const handleVideoEnded = useCallback(() => {
        if (id) {
            updateProgress(id, 100);
        }

        triggerCompletion();
        startAutoplayCountdown();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, updateProgress, autoplay, relatedVideos]);

    useEffect(() => {
        return () => {
            if (simulateTimerRef.current) {
                clearInterval(simulateTimerRef.current);
            }


            if (!id) {
                return;
            }

            const hasCurrentTime = currentTimeRef.current > 0;
            const currentTime = hasCurrentTime ? currentTimeRef.current : simulatedSecondsRef.current;
            const hasDuration = durationRef.current > 0;
            const hasVideoEnded = hasDuration && currentTime >= durationRef.current;

            if (!hasVideoEnded) {
                dispatch(videoActions.setPendingVideoSeek({ videoId: id, time: currentTime }));
                dispatch(videoActions.openMiniPlayer({ videoId: id, currentTime }));

                const hasRealProgress = hasCurrentTime && hasDuration;
                if (hasRealProgress) {
                    const percent = (currentTimeRef.current / durationRef.current) * 100;
                    dispatch(videoActions.updateProgress({ videoId: id, percent }));
                } else if (!hasCurrentTime && simulatedSecondsRef.current > 0) {
                    const simPct = (simulatedSecondsRef.current / SIMULATE_DURATION_S) * 100;
                    const isSimFinished = simPct >= 100;

                    if (!isSimFinished) {
                        dispatch(videoActions.updateProgress({ videoId: id, percent: simPct }));
                    }
                }
            }

            cancelAutoplay();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    function handleReadingScroll() {
        const el = readingContentRef.current;
        if (!el) {
            return;
        }
        const pct = el.scrollTop / (el.scrollHeight - el.clientHeight) * 100;
        setReadingProgress(Math.min(100, pct));
    }

    function handleSeekToChapter(timestamp: string) {
        const seconds = parseTimestamp(timestamp);
        const el = videoRef.current;
        if (el) {
            el.currentTime = seconds;
        } else {
            simulatedSecondsRef.current = seconds;
        }
    }

    // ─── Stable keyboard shortcut handlers (safe before early return) ──────────
    const handleLikeShortcut = useCallback(() => {
        const isCurrentlyLiked = likedVideos.has(video?.id ?? '');
        dispatch(toastActions.addToast({
            message: t(isCurrentlyLiked ? 'toast.unliked' : 'toast.liked'),
            type: 'success',
        }));
        if (video?.id) {
            likeVideo(video.id);
        }
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);

    }, [video?.id, likedVideos, likeVideo, dispatch, t]);

    const handleSaveShortcut = useCallback(() => {
        const isCurrentlySaved = savedVideos.has(video?.id ?? '');
        dispatch(toastActions.addToast({
            message: t(isCurrentlySaved ? 'toast.unsaved' : 'toast.saved'),
            type: 'success',
        }));
        if (video?.id) {
            saveVideo(video.id);
        }
        setSaveAnimating(true);
        setTimeout(() => setSaveAnimating(false), 400);

    }, [video?.id, savedVideos, saveVideo, dispatch, t]);

    useKeyboardShortcuts({
        onOpenUpload: () => { },
        onOpenShortcuts: () => { },
        onFocusSearch: () => { },
        videoPageId: id,
        onLike: handleLikeShortcut,
        onSave: handleSaveShortcut,
    });

    if (!hasVideo) {
        return (
            <div className="video-page">
                <div className="video-page__not-found">
                    <p>{t('video.not_found')}</p>
                </div>
            </div>
        );
    }

    const isLiked = likedVideos.has(video.id);
    const isSaved = savedVideos.has(video.id);
    const isDisliked = dislikedVideos.has(video.id);

    const hasVideoFile = video.videoUrl !== undefined && video.videoUrl !== '';
    const isAutoplayActive = autoplayCountdown !== null;
    const nextVideo = relatedVideos[0];

    const tagPalette = video.tags[0] ? TagColors.palette(video.tags[0]) : null;

    const videoId = video.id;

    function handleLike() {
        dispatch(toastActions.addToast({
            message: t(isLiked ? 'toast.unliked' : 'toast.liked'),
            type: 'success',
        }));
        likeVideo(videoId);
        setLikeAnimating(true);
        setTimeout(() => setLikeAnimating(false), 400);
    }

    function handleDislike() {
        dislikeVideo(videoId);
        setDislikeAnimating(true);
        setTimeout(() => setDislikeAnimating(false), 400);
    }

    function handleSave() {
        dispatch(toastActions.addToast({
            message: t(isSaved ? 'toast.unsaved' : 'toast.saved'),
            type: 'success',
        }));
        saveVideo(videoId);
        setSaveAnimating(true);
        setTimeout(() => setSaveAnimating(false), 400);
    }

    function handleShare() {
        navigator.clipboard.writeText(window.location.href);
        dispatch(toastActions.addToast({ message: t('toast.link_copied'), type: 'info' }));
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    const saveBtnClass = [
        'video-page__reaction-btn',
        isSaved ? 'video-page__reaction-btn--saved' : '',
        saveAnimating ? 'video-page__reaction-btn--burst' : '',
    ].filter(Boolean).join(' ');

    const shareBtnClass = [
        'video-page__reaction-btn',
        isCopied ? 'video-page__reaction-btn--copied' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="video-page">
            <div className="video-page__back-header">
                <Button variant="ghost" size="sm" className="video-page__back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={14} strokeWidth={2} />
                    {t('common.back')}
                </Button>
                {hasSummary && (
                    <Tooltip content={readingMode ? t('video.exit_reading_mode') : t('video.reading_mode')} side="bottom">
                        <Button
                            variant={readingMode ? 'primary' : 'ghost'}
                            size="sm"
                            className="video-page__reading-mode-btn"
                            onClick={() => setReadingMode(v => !v)}
                            aria-pressed={readingMode}
                            aria-label={t('video.reading_mode')}
                        >
                            <BookOpen size={14} strokeWidth={2} />
                            {t('video.reading_mode')}
                        </Button>
                    </Tooltip>
                )}
            </div>
            <div className="video-page__layout">
                <main className="video-page__main">
                    {readingMode && summary ? (
                        <div
                            className="video-page__reading-mode"
                            ref={readingContentRef}
                            onScroll={handleReadingScroll}
                        >
                            <div
                                className="video-page__reading-progress"
                                style={{ width: `${readingProgress}%` }}
                            />
                            <div
                                className="video-page__reading-content"
                                // eslint-disable-next-line @stylistic/max-len
                                dangerouslySetInnerHTML={{ __html: summary.readingMode.replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/^### (.+)$/gm, '<h3>$1</h3>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n\n/g, '</p><p>').replace(/^/, '<p>').replace(/$/, '</p>') }}
                            />
                        </div>
                    ) : (
                        <div className="video-page__player-wrap">
                            {hasVideoFile ? (
                                <VideoPlayer
                                    videoRef={videoRef}
                                    src={video.videoUrl!}
                                    chapters={summary?.chapters}
                                    onTimeUpdate={handleTimeUpdate}
                                    onEnded={handleVideoEnded}
                                    onLoadedMetadata={handleLoadedMetadata}
                                    showCompletion={showCompletion}
                                    ambientColor={tagPalette?.color}
                                />
                            ) : (
                                <div className="video-page__player">
                                    <div className="video-page__player-fallback">
                                        <img
                                            src={video.thumbnail}
                                            alt={video.title}
                                            className="video-page__player-fallback-img"
                                        />
                                        <div className="video-page__player-fallback-msg">
                                            <VideoOff size={32} strokeWidth={1.5} />
                                            <p>{t('video.no_video_file')}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isAutoplayActive && nextVideo && (
                        <div className="video-page__autoplay-banner">
                            <div className="video-page__autoplay-info">
                                <span className="video-page__autoplay-label">{t('video.autoplay_next')}</span>
                                <span className="video-page__autoplay-title">{nextVideo.title}</span>
                            </div>
                            <div className="video-page__autoplay-countdown">
                                <div
                                    className="video-page__autoplay-progress"
                                    style={{ animationDuration: `${AUTOPLAY_COUNTDOWN}s` }}
                                />
                                <span className="video-page__autoplay-seconds">{autoplayCountdown}</span>
                            </div>
                            <Tooltip content={t('video.autoplay_cancel')} side="top">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={cancelAutoplay}
                                    aria-label={t('video.autoplay_cancel')}
                                >
                                    <X size={14} />
                                </Button>
                            </Tooltip>
                        </div>
                    )}

                    <div className="video-page__meta">
                        <h1 className="video-page__title">{video.title}</h1>

                        <div className="video-page__stats-row">
                            <div className="video-page__stats">
                                <span>{Format.views(video.views)} {t('video.views')}</span>
                                <span className="video-page__stats-sep">·</span>
                                <span>{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                                <span className="video-page__stats-sep">·</span>
                                <span className="video-page__channel">{video.channel}</span>
                            </div>

                            <div className="video-page__actions">
                                <Tooltip content={isLiked ? t('video.liked') : t('video.like')} side="top">
                                    <button
                                        className={['video-page__reaction-btn', isLiked ? 'video-page__reaction-btn--liked' : '', likeAnimating ? 'video-page__reaction-btn--burst' : ''].filter(Boolean).join(' ')}
                                        onClick={handleLike}
                                        aria-pressed={isLiked}
                                        aria-label={isLiked ? t('video.liked') : t('video.like')}
                                    >
                                        <span className="video-page__reaction-icon">
                                            <ThumbsUp size={20} strokeWidth={1.75} fill={isLiked ? 'currentColor' : 'none'} />
                                        </span>
                                        <span className="video-page__reaction-label">{t('video.like')}</span>
                                    </button>
                                </Tooltip>

                                <Tooltip content={isDisliked ? t('video.disliked') : t('video.dislike')} side="top">
                                    <button
                                        className={['video-page__reaction-btn', isDisliked ? 'video-page__reaction-btn--disliked' : '', dislikeAnimating ? 'video-page__reaction-btn--burst' : ''].filter(Boolean).join(' ')}
                                        onClick={handleDislike}
                                        aria-pressed={isDisliked}
                                        aria-label={isDisliked ? t('video.disliked') : t('video.dislike')}
                                    >
                                        <span className="video-page__reaction-icon">
                                            <ThumbsDown size={20} strokeWidth={1.75} fill={isDisliked ? 'currentColor' : 'none'} />
                                        </span>
                                        <span className="video-page__reaction-label">{t('video.dislike')}</span>
                                    </button>
                                </Tooltip>

                                <Tooltip content={isSaved ? t('video.saved') : t('video.save')} side="top">
                                    <button
                                        className={saveBtnClass}
                                        onClick={handleSave}
                                        aria-pressed={isSaved}
                                        aria-label={isSaved ? t('video.saved') : t('video.save')}
                                    >
                                        <span className="video-page__reaction-icon">
                                            <Bookmark size={20} strokeWidth={1.75} fill={isSaved ? 'currentColor' : 'none'} />
                                        </span>
                                        <span className="video-page__reaction-label">{isSaved ? t('video.saved') : t('video.save')}</span>
                                    </button>
                                </Tooltip>

                                <Tooltip content={isCopied ? t('video.copied') : t('video.share')} side="top">
                                    <button
                                        className={shareBtnClass}
                                        onClick={handleShare}
                                        aria-label={t('video.share')}
                                    >
                                        <span className="video-page__reaction-icon">
                                            <Link2 size={20} strokeWidth={1.75} />
                                        </span>
                                        <span className="video-page__reaction-label">{isCopied ? t('video.copied') : t('video.share')}</span>
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {video.description && (
                            <p className="video-page__description">{video.description}</p>
                        )}

                        {video.tags.length > 0 && (
                            <div className="video-page__tags">
                                {video.tags.map(tag => (
                                    <span key={tag} className="video-page__tag">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </main>

                <aside className="video-page__sidebar">
                    {sidebarTab === 'related' && (
                        <FilterPanel
                            allTags={allRelatedTags}
                            value={filterState}
                            onChange={setFilterState}
                        />
                    )}
                    <div className="video-page__sidebar-tabs" role="tablist">
                        <button
                            role="tab"
                            aria-selected={sidebarTab === 'related'}
                            className={['video-page__sidebar-tab', sidebarTab === 'related' ? 'video-page__sidebar-tab--active' : ''].filter(Boolean).join(' ')}
                            onClick={() => setSidebarTab('related')}
                        >
                            <List size={14} />
                            {t('video.related')}
                        </button>
                        {hasSummary && (
                            <button
                                role="tab"
                                aria-selected={sidebarTab === 'summary'}
                                className={['video-page__sidebar-tab', sidebarTab === 'summary' ? 'video-page__sidebar-tab--active' : ''].filter(Boolean).join(' ')}
                                onClick={() => setSidebarTab('summary')}
                            >
                                <Lightbulb size={14} />
                                {t('video.summary')}
                                {readingTime > 0 && (
                                    <Badge variant="neutral">{t('video.reading_time', { min: readingTime })}</Badge>
                                )}
                            </button>
                        )}
                    </div>

                    {sidebarTab === 'related' && filteredRelated.length > 0 && (
                        <div className="video-page__sidebar-list">
                            {filteredRelated.map((v, i) => (
                                <VideoCard key={v.id} video={v} index={i} />
                            ))}
                        </div>
                    )}

                    {sidebarTab === 'summary' && hasSummary && (
                        <div className="video-page__summary">
                            <div className="video-page__summary-section">
                                <h3 className="video-page__summary-heading">{t('video.key_points')}</h3>
                                <ul className="video-page__key-points">
                                    {summary!.keyPoints.map((point, i) => (
                                        <li key={i} className="video-page__key-point">{point}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="video-page__summary-section">
                                <h3 className="video-page__summary-heading">{t('video.chapters')}</h3>
                                <div className="video-page__chapters">
                                    {summary!.chapters.map((ch, i) => (
                                        <div
                                            key={i}
                                            className="video-page__chapter"
                                            onClick={() => handleSeekToChapter(ch.timestamp)}
                                        >
                                            <span className="video-page__chapter-time">{ch.timestamp}</span>
                                            <span className="video-page__chapter-title">{ch.title}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
