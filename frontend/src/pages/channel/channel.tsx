import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, PlayCircle, Eye } from 'lucide-react';
import VideoCard from '@components/video/card';
import { useVideo } from '@context/useVideo';
import { Format } from '@utils/format';
import Button from '@ui/button/button';
import Avatar from '@ui/avatar/avatar';
import './channel.css';

export default function ChannelPage() {
    const { t, i18n } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { publishedVideos } = useVideo();

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

    const hasVideos = channelVideos.length > 0;
    const isNotFound = !hasVideos;

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

            <header className="channel-page__header">
                <Avatar name={channelName} size="lg" />
                <div className="channel-page__header-info">
                    <h1 className="channel-page__name">{channelName}</h1>
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
                    </div>
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
