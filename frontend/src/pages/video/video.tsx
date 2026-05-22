import { useRef, useMemo, useState, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown, Bookmark, Link2, Check, VideoOff, BookOpen, List, X, Clock, Clapperboard } from 'lucide-react';
import VideoPlayer from '@components/player/player';
import CommentSection from '@components/comment/section';
import VideoRow from '@components/video/row';
import VideoRowSkeleton from '@components/video/rowSkeleton';
import FilterPanel from '@components/filter/panel';
import ReactionBtn from '@components/video/reactionBtn';
import SavePopover from '@components/video/savePopover';
import ReadingMode from '@components/video/readingMode';
import type { FilterState } from '@components/filter/panel';
import { useAuth } from '@hooks/useAuth';
import { useVideo } from '@hooks/useVideo';
import { usePlaylist } from '@hooks/usePlaylist';
import { useSubscription } from '@hooks/useSubscription';
import { useVideoFetch } from '@hooks/useVideoFetch';
import { useRelatedVideos } from '@hooks/useRelatedVideos';
import { useVideoContent } from '@hooks/useVideoContent';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { selectWatchLaterIds } from '@store/playlistSlice';
import { PLAYLIST_CONSTANTS } from '@models/playlist';
import { toastActions } from '@store/toastSlice';
import { video as videoApi, analytics, AnalyticsSource, type Vuid } from '@api';
import { hasViewed, markViewed } from '@utils/viewedVideos';
import { VideoFilter } from '@utils/applyFilters';
import { Format } from '@utils/format';
import { useBurstAnimation } from '@hooks/useBurstAnimation';
import { useVideoProgress } from '@hooks/useVideoProgress';
import { useAutoplay } from '@hooks/useAutoplay';
import { TagColors } from '@utils/tagColors';
import { ROUTES } from '@utils/routes';
import TagBadge from '@components/tag/badge';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import * as Popover from '@radix-ui/react-popover';
import { Avatar, Button, Tooltip } from '@ui';
import type { Video, VideoId } from '@models/video';
import { VideoStatus } from '@models/video';
import type { Tag } from '@models/tag';
import './video.css';
import { ToastType } from '@enums/toastType';
import { SidebarTab } from '@enums/sidebarTab';

export default function VideoPage() {
    const { t, i18n } = useTranslation();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('v') ?? undefined;
    const dispatch = useAppDispatch();
    const {
        videos, likedVideos, dislikedVideos,
        likeVideo, dislikeVideo, watchVideo,
        updateProgress, videoProgress, autoplay, closeMiniPlayer,
        consumePendingVideoSeek,
    } = useVideo();

    const { playlists, addVideoToPlaylist, removeVideoFromPlaylist } = usePlaylist();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);

    const { user: authUser } = useAuth();
    const { isSubscribed, toggleSubscription } = useSubscription();
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [descExpanded, setDescExpanded] = useState(false);
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>(SidebarTab.RELATED);
    const [readingMode, setReadingMode] = useState(false);
    const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);

    const storeVideo = videos.find((v: Video) => v.id === (id as unknown as VideoId));

    const { video, fetchFailed } = useVideoFetch(id, storeVideo);
    const { relatedVideos, loadingRelated } = useRelatedVideos(video?.id, video?.tags ?? []);
    const { summary, transcription, setTranscription } = useVideoContent(id, video?.status);

    const hasVideo = video !== undefined;
    const isOwner = authUser !== null && video !== undefined && authUser.uuid === video.channelId;

    const videoRef = useRef<HTMLVideoElement>(null);

    const [likeAnimating, triggerLikeAnimation] = useBurstAnimation();
    const [dislikeAnimating, triggerDislikeAnimation] = useBurstAnimation();
    const [_saveAnimating, triggerSaveAnimation] = useBurstAnimation();
    const [isCopied, triggerCopied] = useBurstAnimation(2000);

    const { autoplayCountdown, startAutoplayCountdown, cancelAutoplay } = useAutoplay({
        id,
        autoplay,
        relatedVideos,
    });

    const {
        showCompletion,
        handleLoadedMetadata, handleTimeUpdate, handleVideoEnded, getCurrentTime,
    } = useVideoProgress({
        id,
        videoRef,
        video,
        videoProgress,
        updateProgress: (vid: string, pct: number) => updateProgress(vid as unknown as VideoId, pct),
        onBackendSync: (vid: string, pct: number) => videoApi.updateProgress(vid as unknown as Vuid, pct).catch(() => { }),
        consumePendingVideoSeek: (vid: string) => consumePendingVideoSeek(vid as unknown as VideoId),
        onCompleted: startAutoplayCountdown,
        onFinished: (vuid: string) => videoApi.recordView(vuid as unknown as Vuid),
    });

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
    }, [id, hasVideo, watchVideo, dispatch]);

    // Skip detection: reports an early abandon when leaving the page below 10%
    const skipTrackerRef = useRef<{ vuid: Vuid; percent: number } | null>(null);

    useEffect(() => {
        if (id === undefined) {
            return;
        }

        const vuid = id as unknown as Vuid;
        skipTrackerRef.current = { vuid, percent: 0 };

        return () => {
            const tracker = skipTrackerRef.current;
            skipTrackerRef.current = null;

            if (tracker === null) {
                return;
            }

            const isEarlyAbandon = tracker.percent > 0 && tracker.percent < 10;

            if (!isEarlyAbandon) {
                return;
            }

            analytics.skip({ vuid: tracker.vuid, percent: tracker.percent }).catch(() => { });
        };
    }, [id]);

    useEffect(() => {
        const tracker = skipTrackerRef.current;

        if (tracker === null || video === undefined) {
            return;
        }

        const livePercent = videoProgress[video.id] ?? 0;
        tracker.percent = livePercent;
    }, [videoProgress, video]);

    const handleLikeShortcut = useCallback(() => {
        const isCurrentlyLiked = video?.id ? likedVideos.has(video.id) : false;
        dispatch(toastActions.addToast({
            message: t(isCurrentlyLiked ? 'toast.unliked' : 'toast.liked'),
            type: ToastType.SUCCESS,
        }));

        if (video?.id) {
            likeVideo(video.id);
        }

        triggerLikeAnimation();
    }, [video?.id, likedVideos, likeVideo, dispatch, t, triggerLikeAnimation]);

    const handleSaveShortcut = useCallback(() => {
        const watchLater = playlists.find(p => p.name === PLAYLIST_CONSTANTS.WATCH_LATER);

        if (!watchLater || !video?.id) {
            return;
        }

        const isCurrentlySaved = watchLaterIds.has(video.id as string);
        dispatch(toastActions.addToast({
            message: t(isCurrentlySaved ? 'toast.unsaved' : 'toast.saved'),
            type: ToastType.SUCCESS,
        }));

        if (isCurrentlySaved) {
            removeVideoFromPlaylist(watchLater.id as string, video.id as string);
        } else {
            addVideoToPlaylist(watchLater.id as string, video.id as string);
        }

        triggerSaveAnimation();
    }, [video?.id, watchLaterIds, playlists, addVideoToPlaylist, removeVideoFromPlaylist, dispatch, t, triggerSaveAnimation]);

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
                    <p>{fetchFailed ? t('video.not_found') : t('common.loading')}</p>
                </div>
            </div>
        );
    }

    if (video.status === VideoStatus.PROCESSING) {
        return (
            <div className="video-page">
                <div className="video-page__processing">
                    {video.thumbnail && (
                        <img
                            className="video-page__processing-thumb"
                            src={video.thumbnail}
                            alt=""
                            aria-hidden="true"
                        />
                    )}
                    <div className="video-page__processing-bg" aria-hidden="true" />
                    <div className="video-page__processing-card">
                        <div className="video-page__processing-icon-wrap" aria-hidden="true">
                            <div className="video-page__processing-ring video-page__processing-ring--outer" />
                            <div className="video-page__processing-ring video-page__processing-ring--inner" />
                            <div className="video-page__processing-icon">
                                <Clapperboard size={34} strokeWidth={1.25} />
                            </div>
                        </div>
                        <h2 className="video-page__processing-title">{t('video.processing_title')}</h2>
                        <p className="video-page__processing-sub">{t('video.processing_sub')}</p>
                        <p className="video-page__processing-video-name">{video.title}</p>
                        <div className="video-page__processing-progress" aria-hidden="true">
                            <div className="video-page__processing-progress-bar" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const isLiked = likedVideos.has(video.id);
    const isSaved = watchLaterIds.has(video.id as string);
    const isDisliked = dislikedVideos.has(video.id);
    const isChannelSubscribed = isSubscribed(video.channel);
    const hasLongDesc = (video.description ?? '').length > 220;
    const hasVideoFile = video.videoUrl !== undefined && video.videoUrl !== '';
    const isAutoplayActive = autoplayCountdown !== null;
    const nextVideo = relatedVideos[0];
    const tagPalette = video.tags[0] ? TagColors.palette(video.tags[0]) : null;
    const videoId = video.id;
    const isShareCopied = isCopied;

    function handleLike() {
        dispatch(toastActions.addToast({
            message: t(isLiked ? 'toast.unliked' : 'toast.liked'),
            type: ToastType.SUCCESS,
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
        dispatch(toastActions.addToast({ message: t('toast.link_copied'), type: ToastType.INFO }));
        triggerCopied();
        setIsShareDropdownOpen(false);
    }

    function handleShareCopyAtTime() {
        const seconds = Math.floor(getCurrentTime());
        const baseUrl = window.location.href.split('?')[0];
        const url = `${baseUrl}?t=${seconds}s`;
        navigator.clipboard.writeText(url);
        dispatch(toastActions.addToast({ message: t('toast.link_copied'), type: ToastType.INFO }));
        triggerCopied();
        setIsShareDropdownOpen(false);
    }

    function handleRetryTranscription() {
        if (!video) {
            return;
        }

        const vuid = video.id as unknown as Vuid;
        videoApi.retryTranscription(vuid).then(ok => {
            const didSucceed = ok !== null;

            if (!didSucceed) {
                return;
            }

            videoApi.getTranscription(vuid).then(result => {
                setTranscription(result);
            });
        });
    }

    const videoUrl = video.videoUrl ?? '';

    const shareBtnClass = [
        'video-page__reaction-btn',
        isShareCopied ? 'video-page__reaction-btn--copied' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="video-page">
            <div className="video-page__layout">
                <main className="video-page__main">
                    {readingMode && transcription !== null ? (
                        <ReadingMode
                            summary={summary}
                            transcription={transcription}
                            isOwner={isOwner}
                            onRetryTranscription={handleRetryTranscription}
                        />
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
                                <Link
                                    to={ROUTES.CHANNEL.replace(':id', video.channelId)}
                                    className="video-page__channel-link"
                                >
                                    <Avatar name={video.channel} size="sm" />
                                    <span className="video-page__channel-name">{video.channel}</span>
                                </Link>
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
                                    <Popover.Trigger
                                        className={shareBtnClass}
                                        aria-label={t('video.share')}
                                    >
                                        <span className="rbtn__icon">
                                            {isShareCopied ? (
                                                <Check size={20} strokeWidth={1.75} />
                                            ) : (
                                                <Link2 size={16} strokeWidth={1.75} />
                                            )}
                                        </span>
                                        <span className="rbtn__label">
                                            {isShareCopied ? t('video.copied') : t('video.share')}
                                        </span>
                                    </Popover.Trigger>
                                    <Popover.Portal>
                                        <Popover.Content
                                            className="video-page__share-dropdown"
                                            side="top"
                                            align="center"
                                            sideOffset={6}
                                            role="menu"
                                        >
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="video-page__share-option"
                                                role="menuitem"
                                                leftIcon={<Link2 size={14} strokeWidth={1.75} />}
                                                onClick={handleShareCopyLink}
                                            >
                                                {t('video.share_copy_link')}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="video-page__share-option"
                                                role="menuitem"
                                                leftIcon={<Clock size={14} strokeWidth={1.75} />}
                                                onClick={handleShareCopyAtTime}
                                            >
                                                {t('video.share_copy_at_time')}
                                            </Button>
                                        </Popover.Content>
                                    </Popover.Portal>
                                </Popover.Root>

                                {transcription !== null && (
                                    <ReactionBtn
                                        isActive={readingMode}
                                        icon={<BookOpen size={20} strokeWidth={1.75} />}
                                        iconActive={<BookOpen size={20} strokeWidth={1.75} fill="currentColor" />}
                                        label={t('video.reading_mode')}
                                        activeLabel={t('video.exit_reading_mode')}
                                        className="video-page__reaction-btn"
                                        activeClass="video-page__reaction-btn--reading"
                                        onClick={() => setReadingMode(v => !v)}
                                    />
                                )}
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
                                        <TagBadge
                                            key={tag}
                                            tag={tag}
                                            prefix="#"
                                            onClick={() => dispatch(videoActions.openTagView({ tag, fromVideoId: video.id }))}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <CommentSection vuid={video.id as unknown as Vuid} />
                </main>

                <aside className="video-page__sidebar">
                    <div className="video-page__sidebar-tabs" role="tablist">
                        <button
                            role="tab"
                            aria-selected={sidebarTab === SidebarTab.RELATED}
                            className={['video-page__sidebar-tab', sidebarTab === SidebarTab.RELATED ? 'video-page__sidebar-tab--active' : ''].filter(Boolean).join(' ')}
                            onClick={() => setSidebarTab(SidebarTab.RELATED)}
                        >
                            <List size={14} />
                            {t('video.related')}
                        </button>
                        <div className="video-page__sidebar-filter-slot">
                            <FilterPanel
                                allTags={allRelatedTags}
                                value={filterState}
                                onChange={setFilterState}
                                iconOnly
                            />
                        </div>
                    </div>

                    {sidebarTab === SidebarTab.RELATED && (
                        <div className="video-page__sidebar-list">
                            {loadingRelated
                                ? Array.from({ length: 5 }).map((_, i) => (
                                    <VideoRowSkeleton key={i} />
                                ))
                                : filteredRelated.map((v, idx) => (
                                    <VideoRow key={v.id} video={v} source={AnalyticsSource.RECOMMENDED} position={idx} />
                                ))
                            }
                        </div>
                    )}
                </aside>
            </div>
        </div>
    );
}
