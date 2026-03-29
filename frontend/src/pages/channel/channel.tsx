import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PlayCircle, Eye, TrendingUp } from 'lucide-react';
import VideoCard from '@components/video/card';
import { useVideo } from '@context/useVideo';
import { useSubscription } from '@context/useSubscription';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { Format } from '@utils/format';
import TagBadge from '@components/tag/badge';
import Button from '@ui/button/button';
import Avatar from '@ui/avatar/avatar';
import './channel.css';

const TOP_TAGS_COUNT = 4;

export default function ChannelPage() {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const { publishedVideos } = useVideo();
    const { isSubscribed, toggleSubscription } = useSubscription();

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
        const tagCounts = new Map<string, number>();
        for (const video of channelVideos) {
            for (const tag of video.tags) {
                const isShorts = tag === 'shorts';
                if (isShorts) { continue; }
                tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
            }
        }
        return [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, TOP_TAGS_COUNT)
            .map(([tag]) => tag);
    }, [channelVideos]);

    const mostViewedVideo = useMemo(() => {
        const hasNoVideos = channelVideos.length === 0;
        if (hasNoVideos) { return null; }
        return channelVideos.reduce((best, v) => v.views > best.views ? v : best);
    }, [channelVideos]);

    const hasVideos = channelVideos.length > 0;
    const isNotFound = !hasVideos;
    const isChannelSubscribed = isSubscribed(id ?? '');

    function handleSubscribeToggle() {
        const channelId = id ?? '';
        toggleSubscription(channelId);
        dispatch(toastActions.addToast({
            message: t(isChannelSubscribed ? 'toast.unsubscribed' : 'toast.subscribed'),
            type: 'success',
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
            <div className="channel-page__back-header">
                <Button variant="ghost" size="sm" className="channel-page__back-btn" onClick={() => navigate(-1)}>
                    <ArrowLeft size={14} strokeWidth={2} />
                    {t('common.back')}
                </Button>
            </div>

            {/* Banner */}
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
                                    new Date(Math.min(...channelVideos.map(v => new Date(v.publishedAt).getTime()))),
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

            <main className="channel-page__main">
                <div className="channel-page__grid">
                    {channelVideos.map((video, i) => (
                        <VideoCard key={video.id} video={video} index={i} />
                    ))}
                </div>
            </main>
        </div>
    );
}
