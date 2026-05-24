import { useMemo, useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Eye, TrendingUp, Play, Clock, Flame, Hash } from 'lucide-react';
import VideoCard from '@components/video/card';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { Format } from '@utils/format';
import { VideoFilter, SortBy } from '@utils/applyFilters';
import TagBadge from '@components/tag/badge';
import { TagColors } from '@utils/tagColors';
import type { Tag } from '@models/tag';
import Button from '@ui/button/button';
import Avatar from '@ui/avatar/avatar';
import { videoUrl } from '@utils/routes';
import { comments as commentsApi } from '@api';
import type { Comment } from '@models/comment';
import type { Vuid } from '@api';
import type { ChannelId } from '@models/channel';
import './channel.css';
import { ToastType } from '@enums/toastType';
import { useVideo, useSubscription } from '@hooks';

const TOP_TAGS_COUNT = 4;
const SECTIONS_THRESHOLD = 8;

// eslint-disable-next-line complexity
export default function ChannelPage() {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { publishedVideos } = useVideo();
    const { isSubscribed, toggleSubscription } = useSubscription();
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState());
    const [spotlightComments, setSpotlightComments] = useState<Comment[]>([]);
    const allVideosRef = useRef<HTMLDivElement>(null);

    const channelVideos = useMemo(() => {
        const isIdMissing = !id;
        if (isIdMissing) {
            return [];
        }

        return publishedVideos.filter(v => v.channelId === id);
    }, [publishedVideos, id]);

    const channelName = channelVideos[0]?.channel ?? id ?? '';

    const totalViews = useMemo(
        () => channelVideos.reduce((acc, v) => acc + v.views, 0),
        [channelVideos],
    );

    const topTags = useMemo(() => {
        const tagCounts = new Map<Tag, number>();
        for (const video of channelVideos) {
            for (const tag of video.tags) {
                const isShorts = tag === 'shorts';
                if (isShorts) {
                    continue;
                }
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
        }
        return [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_TAGS_COUNT)
            .map(([tag]) => tag);
    }, [channelVideos]);

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const video of channelVideos) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }, [channelVideos]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(channelVideos, filterState),
        [channelVideos, filterState],
    );

    const mostViewedVideo = useMemo(() => {
        const hasNoVideos = channelVideos.length === 0;
        if (hasNoVideos) {
            return null;
        }
        return channelVideos.reduce((best, v) => v.views > best.views ? v : best);
    }, [channelVideos]);

    const sections = useMemo(() => {
        const isFiltered = !VideoFilter.isEmpty(filterState);
        const hasEnough = channelVideos.length >= SECTIONS_THRESHOLD;

        if (isFiltered || !hasEnough) {
            return null;
        }

        const featured = mostViewedVideo;

        const latest = [...channelVideos]
            .sort((a, b) => new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime())
            .filter(v => v.id !== featured?.id)
            .slice(0, 5);

        const mostViewed = [...channelVideos]
            .sort((a, b) => b.views - a.views)
            .filter(v => v.id !== featured?.id)
            .slice(0, 6);

        const tagCounts = new Map<Tag, number>();
        for (const video of channelVideos) {
            for (const tag of video.tags) {
                const isShorts = tag === 'shorts';
                if (!isShorts) {
                    tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
                }
            }
        }
        const tagSections = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .filter(([, count]) => count >= 2)
            .map(([tag, count]) => ({
                tag,
                count,
                videos: channelVideos
                    .filter(v => v.tags.includes(tag))
                    .sort((a, b) => b.views - a.views)
                    .slice(0, 3),
            }));

        return { featured, latest, mostViewed, tagSections };
    }, [channelVideos, filterState, mostViewedVideo]);

    function scrollToAllVideos(newFilter?: Partial<FilterState>) {
        if (newFilter) {
            setFilterState({ ...VideoFilter.emptyState(), ...newFilter });
        }
        setTimeout(() => {
            allVideosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
    }

    const featuredId = sections?.featured?.id ?? null;

    useEffect(() => {
        const isNoFeatured = featuredId === null;
        if (isNoFeatured) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSpotlightComments([]);
            return;
        }
        commentsApi.list(featuredId as unknown as Vuid, { page: 1 }).then(res => {
            const hasResult = res !== null;
            if (hasResult) {
                setSpotlightComments(res.data.slice(0, 2));
            }
        });
    }, [featuredId]);

    function handleCoverWatchClick(e: React.MouseEvent) {
        e.stopPropagation();
        const featuredVideoId = sections?.featured?.id;
        const hasFeaturedVideoId = featuredVideoId !== undefined;
        if (hasFeaturedVideoId) {
            navigate(videoUrl(featuredVideoId));
        }
    }

    const hasVideos = channelVideos.length > 0;
    const isNotFound = !hasVideos;
    const channelId = id as ChannelId | undefined;
    const isChannelSubscribed = isSubscribed(channelId ?? '' as ChannelId);

    function handleSubscribeToggle() {
        toggleSubscription(channelId ?? '' as ChannelId);
        dispatch(toastActions.addToast({
            message: t(isChannelSubscribed ? 'toast.unsubscribed' : 'toast.subscribed'),
            type: ToastType.SUCCESS,
        }));
    }

    if (isNotFound) {
        return (
            <div className="channel-page">
                <div className="channel-page__not-found">
                    <p>{t('channel.not_found')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="channel-page">
            <div className="channel-page__banner" aria-hidden />

            <header className="channel-page__header">
                <Avatar name={channelName} size="lg" />
                <div className="channel-page__header-info">
                    <div className="channel-page__name-row">
                        <h1 className="channel-page__name">{channelName}</h1>
                        <Button
                            variant="ghost"
                            size="sm"
                            aria-pressed={isChannelSubscribed}
                            className={['channel-page__subscribe-btn', isChannelSubscribed ? 'channel-page__subscribe-btn--subscribed' : ''].filter(Boolean).join(' ')}
                            onClick={handleSubscribeToggle}
                        >
                            {isChannelSubscribed ? t('channel.subscribed') : t('channel.subscribe')}
                        </Button>
                    </div>
                    <div className="channel-page__stats">
                        <span className="channel-page__stat">
                            <PlayCircle size={14} strokeWidth={2} />
                            {t('video.videos_count', { count: channelVideos.length })}
                        </span>
                        <span className="channel-page__stat-sep">·</span>
                        <span className="channel-page__stat">
                            <Eye size={14} strokeWidth={2} />
                            {Format.views(totalViews)} {t('video.views')}
                        </span>
                        <span className="channel-page__stat-sep">·</span>
                        <span className="channel-page__stat channel-page__stat--date">
                            {t('channel.since', {
                                year: new Intl.DateTimeFormat(i18n.language, { year: 'numeric' }).format(
                                    new Date(Math.min(...channelVideos.map(v => new Date(v.publishedAt ?? v.createdAt).getTime()))),
                                ),
                            })}
                        </span>
                        {mostViewedVideo !== null && (
                            <>
                                <span className="channel-page__stat-sep">·</span>
                                <span className="channel-page__stat channel-page__stat--most-watched">
                                    <TrendingUp size={14} strokeWidth={2} />
                                    <span className="channel-page__stat-label">{t('channel.most_watched')}:</span>
                                    <span className="channel-page__stat-video-title">{mostViewedVideo.title}</span>
                                </span>
                            </>
                        )}
                    </div>
                    {topTags.length > 0 && (
                        <div className="channel-page__top-tags">
                            {topTags.map(tag => (
                                <TagBadge key={tag} tag={tag} prefix="#" className="channel-page__tag-pill" />
                            ))}
                        </div>
                    )}
                </div>
            </header>

            {sections !== null && (
                <div className="channel-page__sections">
                    {/* ─── Cover Story ─── */}
                    {sections.featured !== null && (
                        <div
                            className="channel-page__cover"
                            style={{ backgroundImage: `url(${sections.featured.thumbnail})` }}
                            role="button"
                            tabIndex={0}
                            aria-label={sections.featured.title}
                            onClick={() => navigate(videoUrl(sections.featured!.id))}
                            onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(sections.featured!.id))}
                        >
                            <div className="channel-page__cover-content">
                                <span className="channel-page__cover-badge">{t('channel.cover_badge')}</span>
                                <h2 className="channel-page__cover-title">{sections.featured.title}</h2>
                                <div className="channel-page__cover-meta">
                                    <Eye size={13} />
                                    {Format.views(sections.featured.views)} {t('video.views')}
                                    {sections.featured.publishedAt && (
                                        <>
                                            <span className="channel-page__cover-sep" />
                                            {Format.relativeDate(sections.featured.publishedAt)}
                                        </>
                                    )}
                                </div>
                                {sections.featured.tags.length > 0 && (
                                    <div className="channel-page__cover-tags">
                                        {sections.featured.tags.slice(0, 4).map(tag => {
                                            const palette = TagColors.palette(tag as string);
                                            const tagStyle = { background: palette.bg, color: palette.color };
                                            return (
                                                <span key={tag as string} className="channel-page__cover-tag" style={tagStyle}>
                                                    {tag as string}
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                {spotlightComments.length > 0 && (
                                    <>
                                        <div className="channel-page__cover-divider" />
                                        <div className="channel-page__cover-comments">
                                            {spotlightComments.map(c => (
                                                <p key={c.id} className="channel-page__cover-comment-text">
                                                    "{c.content}" — {c.author.name}
                                                </p>
                                            ))}
                                        </div>
                                    </>
                                )}
                                <div className="channel-page__cover-bottom">
                                    <button
                                        type="button"
                                        className="channel-page__cover-watch btn btn--primary btn--sm"
                                        onClick={handleCoverWatchClick}
                                    >
                                        <Play size={13} fill="currentColor" />
                                        {t('video.watch_now')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ─── Latest Uploads (asymmetric 5-up mosaic) ─── */}
                    {sections.latest.length > 0 && (
                        <div className="channel-page__section">
                            <div className="channel-page__section-header">
                                <h3 className="channel-page__section-title">
                                    <Clock size={16} strokeWidth={2} />
                                    {t('channel.latest_uploads')}
                                </h3>
                                <button type="button" className="channel-page__section-see-all" onClick={() => scrollToAllVideos({ sortBy: SortBy.RECENT })}>
                                    {t('channel.see_all')}
                                </button>
                            </div>
                            <div className="channel-page__latest-grid">
                                {sections.latest.map(video => (
                                    <VideoCard key={video.id} video={video} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ─── Top Videos (diamond pyramid) ─── */}
                    {sections.mostViewed.length >= 1 && (
                        <div className="channel-page__section">
                            <div className="channel-page__section-header">
                                <h3 className="channel-page__section-title">
                                    <Flame size={16} strokeWidth={2} />
                                    {t('channel.top_videos')}
                                </h3>
                                <button type="button" className="channel-page__section-see-all" onClick={() => scrollToAllVideos({ sortBy: SortBy.VIEWS })}>
                                    {t('channel.see_all')}
                                </button>
                            </div>
                            <div className="channel-page__diamond-tiers">
                                <div className="channel-page__diamond-tier">
                                    <div
                                        className="channel-page__diamond"
                                        style={{ backgroundImage: `url(${sections.mostViewed[0].thumbnail})` }}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => navigate(videoUrl(sections.mostViewed[0].id))}
                                        onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(sections.mostViewed[0].id))}
                                    >
                                        <div className="channel-page__diamond-overlay">
                                            <div className="channel-page__diamond-info">
                                                <span className="channel-page__diamond-rank">#1</span>
                                                <span className="channel-page__diamond-title">{sections.mostViewed[0].title}</span>
                                                <span className="channel-page__diamond-views">{Format.views(sections.mostViewed[0].views)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {sections.mostViewed.length >= 3 && (
                                    <div className="channel-page__diamond-tier">
                                        {sections.mostViewed.slice(1, 3).map((video, i) => (
                                            <div
                                                key={video.id}
                                                className="channel-page__diamond"
                                                style={{ backgroundImage: `url(${video.thumbnail})` }}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => navigate(videoUrl(video.id))}
                                                onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(video.id))}
                                            >
                                                <div className="channel-page__diamond-overlay">
                                                    <div className="channel-page__diamond-info">
                                                        <span className="channel-page__diamond-rank">#{i + 2}</span>
                                                        <span className="channel-page__diamond-title">{video.title}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {sections.mostViewed.length >= 6 && (
                                    <div className="channel-page__diamond-tier">
                                        {sections.mostViewed.slice(3, 6).map((video, i) => (
                                            <div
                                                key={video.id}
                                                className="channel-page__diamond"
                                                style={{ backgroundImage: `url(${video.thumbnail})` }}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => navigate(videoUrl(video.id))}
                                                onKeyDown={e => e.key === 'Enter' && navigate(videoUrl(video.id))}
                                            >
                                                <div className="channel-page__diamond-overlay">
                                                    <div className="channel-page__diamond-info">
                                                        <span className="channel-page__diamond-rank">#{i + 4}</span>
                                                        <span className="channel-page__diamond-title">{video.title}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ─── By Topic (magazine covers) ─── */}
                    {sections.tagSections.length > 0 && (
                        <div className="channel-page__section">
                            <div className="channel-page__section-header">
                                <h3 className="channel-page__section-title">
                                    <Hash size={15} strokeWidth={2.5} />
                                    {t('channel.by_topic')}
                                </h3>
                            </div>
                            <div className="channel-page__topics">
                                {sections.tagSections.map(({ tag, count, videos: tagVideos }) => {
                                    const coverThumb = tagVideos[0]?.thumbnail ?? '';
                                    return (
                                        <div
                                            key={tag}
                                            className="channel-page__topic-cover"
                                            style={{ backgroundImage: `url(${coverThumb})` }}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => scrollToAllVideos({ tags: [tag] })}
                                            onKeyDown={e => e.key === 'Enter' && scrollToAllVideos({ tags: [tag] })}
                                        >
                                            <div className="channel-page__topic-cover-content">
                                                <span className="channel-page__topic-cover-tag">#{tag}</span>
                                                <span className="channel-page__topic-cover-count">
                                                    {t('channel.topic_videos', { count })}
                                                </span>
                                                <div className="channel-page__topic-cover-list">
                                                    {tagVideos.map(v => (
                                                        <span key={v.id} className="channel-page__topic-cover-item">{v.title}</span>
                                                    ))}
                                                </div>
                                                <div className="channel-page__topic-cover-footer">
                                                    <button
                                                        type="button"
                                                        className="channel-page__topic-cover-see-all"
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            scrollToAllVideos({ tags: [tag] });
                                                        }}
                                                    >
                                                        {t('channel.see_all')} →
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <main className="channel-page__main">
                {sections !== null && (
                    <div className="channel-page__all-videos-header" ref={allVideosRef}>
                        <h3 className="channel-page__section-title">
                            <Play size={15} strokeWidth={2} />
                            {t('channel.all_videos')}
                        </h3>
                    </div>
                )}
                <div className="channel-page__filters">
                    <FilterPanel allTags={allTags} value={filterState} onChange={setFilterState} />
                </div>
                <div className="channel-page__grid">
                    {filteredVideos.map((video, i) => (
                        <VideoCard key={video.id} video={video} index={i} />
                    ))}
                </div>
            </main>
        </div>
    );
}
