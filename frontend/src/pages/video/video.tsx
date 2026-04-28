import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Bookmark, Link2, Check, VideoOff, ArrowLeft, BookOpen, List, Lightbulb, X, ChevronDown, Clock } from 'lucide-react';
import VideoPlayer from '@components/player/player';
import VideoRow from '@components/video/row';
import FilterPanel from '@components/filter/panel';
import ReactionBtn from '@components/video/reactionBtn';
import SavePopover from '@components/video/savePopover';
import ReadingMode from '@components/video/readingMode';
import type { FilterState } from '@components/filter/panel';
import { useVideo } from '@hooks/useVideo';
import { useSubscription } from '@hooks/useSubscription';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { toastActions } from '@store/toastSlice';
import { video as videoApi, type Vuid } from '@api';
import { hasViewed, markViewed } from '@utils/viewedVideos';
import { VideoFilter } from '@utils/applyFilters';
import { Format } from '@utils/format';
import { useBurstAnimation } from '@hooks/useBurstAnimation';
import { useVideoProgress } from '@hooks/useVideoProgress';
import { useAutoplay } from '@hooks/useAutoplay';
import { getVideoSummary } from '@data/mockSummaries';
import { TagColors } from '@utils/tagColors';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import * as Popover from '@radix-ui/react-popover';
import { Avatar, Button, Tooltip, Badge } from '@ui';
import type { Video } from '@data/mockVideos';
import type { VideoId } from '@models/video';
import type { Tag } from '@models/tag';
import './video.css';

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
    const [searchParams] = useSearchParams();
    const id = searchParams.get('v') ?? undefined;
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const {
        videos, likedVideos, dislikedVideos, savedVideos,
        likeVideo, dislikeVideo, saveVideo, watchVideo,
        updateProgress, videoProgress, autoplay, closeMiniPlayer,
        consumePendingVideoSeek,
    } = useVideo();

    const { isSubscribed, toggleSubscription } = useSubscription();
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [descExpanded, setDescExpanded] = useState(false);

    const video = videos.find((v: Video) => v.id === (id as unknown as VideoId));
    const hasVideo = video !== undefined;

    const videoRef = useRef<HTMLVideoElement>(null);

    const [likeAnimating, triggerLikeAnimation] = useBurstAnimation();
    const [dislikeAnimating, triggerDislikeAnimation] = useBurstAnimation();
    const [_saveAnimating, triggerSaveAnimation] = useBurstAnimation();
    const [isCopied, triggerCopied] = useBurstAnimation(2000);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>('related');
    const [readingMode, setReadingMode] = useState(false);

    // VISUAL-09: chapter seeking feedback
    const [seekingChapterIndex, setSeekingChapterIndex] = useState<number | null>(null);

    // UX-16: share dropdown
    const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);

    const relatedVideos = useMemo(() => {
        if (!video) {
            return [];
        }
        const videoTagSet = new Set(video.tags);
        return videos
            .filter((v: Video) => v.id !== video.id && v.tags.some((t: Tag) => videoTagSet.has(t)))
            .sort((a: Video, b: Video) => b.views - a.views)
            .slice(0, 10);
    }, [video, videos]);

    // ─── Extracted hooks — declared before any derived state that depends on them ─

    const { autoplayCountdown, startAutoplayCountdown, cancelAutoplay } = useAutoplay({
        id,
        autoplay,
        relatedVideos,
    });

    const {
        currentTime, showCompletion,
        handleLoadedMetadata, handleTimeUpdate, handleVideoEnded, getCurrentTime,
    } = useVideoProgress({
        id,
        videoRef,
        video,
        videoProgress,
        updateProgress: (id: string, pct: number) => updateProgress(id as unknown as VideoId, pct),
        consumePendingVideoSeek: (id: string) => consumePendingVideoSeek(id as unknown as VideoId),
        onCompleted: startAutoplayCountdown,
    });

    // ─── Derived state that depends on hook output ────────────────────────────

    const allRelatedTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const v of relatedVideos) {
            for (const tag of v.tags) {
                tagSet.add(tag as string);
            }
        }
        return Array.from(tagSet).sort() as unknown as Tag[];
    }, [relatedVideos]);

    const filteredRelated = useMemo(
        () => VideoFilter.apply(relatedVideos, filterState),
        [relatedVideos, filterState],
    );

    const summary = useMemo(() => {
        if (!video) {
            return null;
        }
        return getVideoSummary(video.id);
    }, [video]);

    const hasSummary = summary !== null;

    const readingTime = useMemo(() => {
        const hasSummaryContent = summary !== null;
        if (!hasSummaryContent) {
            return 0;
        }
        const words = summary.readingMode.split(/\s+/).length;
        return Math.max(1, Math.ceil(words / 200));
    }, [summary]);

    // VISUAL-08: active chapter index derived from current playback position
    const activeChapterIndex = useMemo(() => {
        if (!summary || summary.chapters.length === 0) {
            return -1;
        }
        let active = -1;
        for (let i = 0; i < summary.chapters.length; i++) {
            const chapterTime = parseTimestamp(summary.chapters[i].timestamp);
            const isBeforeOrAt = chapterTime <= currentTime;
            if (isBeforeOrAt) {
                active = i;
            }
        }
        return active;
    }, [summary, currentTime]);

    // ─── Side effects ─────────────────────────────────────────────────────────

    useEffect(() => {
        closeMiniPlayer();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    useEffect(() => {
        const shouldRegister = hasVideo && id !== undefined && !hasViewed(id);
        if (!shouldRegister) {
            return;
        }
        markViewed(id);
        watchVideo(id as unknown as VideoId);
        videoApi.recordView(id as unknown as Vuid);
        dispatch(videoActions.incrementViews(id as unknown as VideoId));
    }, [id, hasVideo, watchVideo]);

    // ─── Stable keyboard shortcut handlers (safe before early return) ──────────

    const handleLikeShortcut = useCallback(() => {
        const isCurrentlyLiked = video?.id ? likedVideos.has(video.id) : false;
        dispatch(toastActions.addToast({
            message: t(isCurrentlyLiked ? 'toast.unliked' : 'toast.liked'),
            type: 'success',
        }));
        if (video?.id) {
            likeVideo(video.id);
        }
        triggerLikeAnimation();
    }, [video?.id, likedVideos, likeVideo, dispatch, t, triggerLikeAnimation]);

    const handleSaveShortcut = useCallback(() => {
        const isCurrentlySaved = video?.id ? savedVideos.has(video.id) : false;
        dispatch(toastActions.addToast({
            message: t(isCurrentlySaved ? 'toast.unsaved' : 'toast.saved'),
            type: 'success',
        }));
        if (video?.id) {
            saveVideo(video.id);
        }
        triggerSaveAnimation();
    }, [video?.id, savedVideos, saveVideo, dispatch, t, triggerSaveAnimation]);

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
    const isChannelSubscribed = isSubscribed(video.channel);
    const hasLongDesc = (video.description ?? '').length > 220;

    const hasVideoFile = video.videoUrl !== undefined && video.videoUrl !== '';
    const isAutoplayActive = autoplayCountdown !== null;
    const nextVideo = relatedVideos[0];

    const tagPalette = video.tags[0] ? TagColors.palette(video.tags[0]) : null;

    const videoId = video.id;

    // UX-07: named boolean for share copied state
    const isShareCopied = isCopied;

    function handleLike() {
        dispatch(toastActions.addToast({
            message: t(isLiked ? 'toast.unliked' : 'toast.liked'),
            type: 'success',
        }));
        likeVideo(videoId);
        triggerLikeAnimation();
    }

    function handleDislike() {
        dislikeVideo(videoId);
        triggerDislikeAnimation();
    }

    function handleShareCopyLink() {
        const url = window.location.href.split('?')[0];
        navigator.clipboard.writeText(url);
        dispatch(toastActions.addToast({ message: t('toast.link_copied'), type: 'info' }));
        triggerCopied();
        setIsShareDropdownOpen(false);
    }

    function handleShareCopyAtTime() {
        const seconds = Math.floor(getCurrentTime());
        const baseUrl = window.location.href.split('?')[0];
        const url = `${baseUrl}?t=${seconds}s`;
        navigator.clipboard.writeText(url);
        dispatch(toastActions.addToast({ message: t('toast.link_copied'), type: 'info' }));
        triggerCopied();
        setIsShareDropdownOpen(false);
    }

    function handleSeekToChapter(timestamp: string, chapterIndex: number) {
        const seconds = parseTimestamp(timestamp);
        const el = videoRef.current;
        if (el) {
            el.currentTime = seconds;
        }

        // VISUAL-09: brief seeking feedback
        setSeekingChapterIndex(chapterIndex);
        setTimeout(() => setSeekingChapterIndex(null), 600);
    }

    const videoUrl = video.videoUrl ?? '';

    const shareBtnClass = [
        'video-page__reaction-btn',
        isShareCopied ? 'video-page__reaction-btn--copied' : '',
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
                        <ReadingMode summary={summary} />
                    ) : (
                        <div className="video-page__player-wrap">
                            {hasVideoFile ? (
                                <VideoPlayer
                                    videoRef={videoRef}
                                    src={videoUrl}
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
                        <div
                            className="video-page__autoplay-banner"
                            aria-live="polite"
                            aria-atomic="true"
                            role="status"
                        >
                            <div className="video-page__autoplay-info">
                                <span className="video-page__autoplay-label">{t('video.autoplay_next')}</span>
                                <span className="video-page__autoplay-title">{nextVideo.title}</span>
                            </div>
                            <div className="video-page__autoplay-countdown">
                                <div className="video-page__autoplay-progress" style={{ animationDuration: '5s' }} />
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

                        <div className="video-page__channel-row">
                            <div className="video-page__channel-info">
                                <Avatar name={video.channel} size="sm" />
                                <span className="video-page__channel-name">{video.channel}</span>
                                <button
                                    type="button"
                                    className={['video-page__subscribe-btn', isChannelSubscribed ? 'video-page__subscribe-btn--active' : ''].filter(Boolean).join(' ')}
                                    onClick={() => toggleSubscription(video.channel)}
                                    aria-pressed={isChannelSubscribed}
                                >
                                    {isChannelSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
                                </button>
                            </div>

                            <div className="video-page__actions">
                                <ReactionBtn
                                    isActive={isLiked}
                                    isAnimating={likeAnimating}
                                    icon={<ThumbsUp size={20} strokeWidth={1.75} fill="none" />}
                                    iconActive={<ThumbsUp size={20} strokeWidth={1.75} fill="currentColor" />}
                                    label={t('video.like')}
                                    activeLabel={t('video.liked')}
                                    className="video-page__reaction-btn"
                                    activeClass="video-page__reaction-btn--liked"
                                    onClick={handleLike}
                                />

                                <ReactionBtn
                                    isActive={isDisliked}
                                    isAnimating={dislikeAnimating}
                                    icon={<ThumbsDown size={20} strokeWidth={1.75} fill="none" />}
                                    iconActive={<ThumbsDown size={20} strokeWidth={1.75} fill="currentColor" />}
                                    label={t('video.dislike')}
                                    activeLabel={t('video.disliked')}
                                    className="video-page__reaction-btn"
                                    activeClass="video-page__reaction-btn--disliked"
                                    onClick={handleDislike}
                                />

                                <SavePopover videoId={videoId as unknown as string}>
                                    <ReactionBtn
                                        isActive={isSaved}
                                        icon={<Bookmark size={20} strokeWidth={1.75} fill="none" />}
                                        iconActive={<Bookmark size={20} strokeWidth={1.75} fill="currentColor" />}
                                        label={t('video.save')}
                                        activeLabel={t('video.saved')}
                                        className="video-page__reaction-btn"
                                        activeClass="video-page__reaction-btn--saved"
                                        onClick={() => { }}
                                    />
                                </SavePopover>

                                <Popover.Root open={isShareDropdownOpen} onOpenChange={setIsShareDropdownOpen}>
                                    <Popover.Trigger asChild>
                                        <button
                                            type="button"
                                            className={shareBtnClass}
                                            aria-label={t('video.share')}
                                            aria-expanded={isShareDropdownOpen}
                                            aria-haspopup="true"
                                        >
                                            <span className="rbtn__icon">
                                                {isShareCopied ? (
                                                    <Check size={20} strokeWidth={1.75} />
                                                ) : (
                                                    <>
                                                        <Link2 size={16} strokeWidth={1.75} />
                                                        <ChevronDown size={10} strokeWidth={2} className="video-page__share-chevron" />
                                                    </>
                                                )}
                                            </span>
                                            <span className="rbtn__label">{isShareCopied ? t('video.copied') : t('video.share')}</span>
                                        </button>
                                    </Popover.Trigger>
                                    <Popover.Portal>
                                        <Popover.Content
                                            className="video-page__share-dropdown"
                                            side="top"
                                            align="center"
                                            sideOffset={6}
                                            role="menu"
                                        >
                                            <button
                                                className="video-page__share-option"
                                                role="menuitem"
                                                onClick={handleShareCopyLink}
                                            >
                                                <Link2 size={14} strokeWidth={1.75} />
                                                {t('video.share_copy_link', 'Copy link')}
                                            </button>
                                            <button
                                                className="video-page__share-option"
                                                role="menuitem"
                                                onClick={handleShareCopyAtTime}
                                            >
                                                <Clock size={14} strokeWidth={1.75} />
                                                {t('video.share_copy_at_time', 'Copy link at current time')}
                                            </button>
                                        </Popover.Content>
                                    </Popover.Portal>
                                </Popover.Root>
                            </div>
                        </div>

                        <div className="video-page__description-card">
                            <div className="video-page__description-meta">
                                <span>{Format.views(video.views)} {t('video.views')}</span>
                                <span className="video-page__description-sep">·</span>
                                <span>{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                            </div>

                            {video.description && (
                                <>
                                    <p className={[
                                        'video-page__description',
                                        !descExpanded && hasLongDesc ? 'video-page__description--clamped' : '',
                                    ].filter(Boolean).join(' ')}>
                                        {video.description}
                                    </p>
                                    {hasLongDesc && (
                                        <button
                                            type="button"
                                            className="video-page__description-toggle"
                                            onClick={() => setDescExpanded(v => !v)}
                                        >
                                            {descExpanded ? t('video.show_less') : t('video.show_more')}
                                        </button>
                                    )}
                                </>
                            )}

                            {video.tags.length > 0 && (
                                <div className="video-page__tags">
                                    {video.tags.map(tag => (
                                        <span key={tag} className="video-page__tag">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                <aside className="video-page__sidebar">
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
                        {sidebarTab === 'related' && (
                            <div className="video-page__sidebar-filter-slot">
                                <FilterPanel
                                    allTags={allRelatedTags}
                                    value={filterState}
                                    onChange={setFilterState}
                                />
                            </div>
                        )}
                    </div>

                    {sidebarTab === 'related' && (
                        <>
                            {filteredRelated.length > 0 && (
                                <div className="video-page__sidebar-list">
                                    {filteredRelated.map((v) => (
                                        <VideoRow key={v.id} video={v} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {sidebarTab === 'summary' && summary && (
                        <div className="video-page__summary">
                            <div className="video-page__summary-section">
                                <h3 className="video-page__summary-heading">{t('video.key_points')}</h3>
                                <ul className="video-page__key-points">
                                    {summary.keyPoints.map((point, i) => (
                                        <li key={i} className="video-page__key-point">{point}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="video-page__summary-section">
                                <h3 className="video-page__summary-heading">{t('video.chapters')}</h3>
                                <div className="video-page__chapters">
                                    {summary.chapters.map((ch, i) => {
                                        const isActiveChapter = i === activeChapterIndex;
                                        const isSeekingChapter = i === seekingChapterIndex;
                                        const chapterClass = [
                                            'video-page__chapter',
                                            isActiveChapter ? 'video-page__chapter--active' : '',
                                            isSeekingChapter ? 'video-page__chapter--seeking' : '',
                                        ].filter(Boolean).join(' ');
                                        return (
                                            <button
                                                key={i}
                                                className={chapterClass}
                                                onClick={() => handleSeekToChapter(ch.timestamp, i)}
                                                aria-label={ch.title}
                                            >
                                                <span className="video-page__chapter-time">{ch.timestamp}</span>
                                                <span className="video-page__chapter-title">{ch.title}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
