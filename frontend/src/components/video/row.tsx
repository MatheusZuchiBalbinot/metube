import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VideoStatus, type Video } from '@data/mockVideos';
import { ROUTES } from '@utils/routes';
import { Format, ONE_WEEK_MS, getVisibleTags } from '@utils/format';
import { TagColors } from '@utils/tagColors';
import { useVideo } from '@context/useVideo';
import TagBadge from '@components/tag/badge';
import VideoStatusBadges from './statusBadges';
import './row.css';

interface VideoRowProps {
    video: Video
    highlighted?: boolean
}

// eslint-disable-next-line complexity
const VideoRow = memo(function VideoRow({ video, highlighted = false }: VideoRowProps) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { openTagView, videoProgress } = useVideo();

    const palette = TagColors.palette(video.tags[0] ?? video.id);

    const now = new Date();
    const isScheduledAndFuture =
        video.status === VideoStatus.SCHEDULED &&
        video.scheduledAt !== undefined &&
        new Date(video.scheduledAt) > now;

    const progress = videoProgress[video.id] ?? 0;
    const isWatched = progress >= 95;

    const isNew = !isScheduledAndFuture && Date.now() - new Date(video.publishedAt).getTime() < ONE_WEEK_MS;

    const rowClass = ['video-row', highlighted ? 'video-row--highlighted' : '']
        .filter(Boolean)
        .join(' ');

    function handleRowClick() {
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleRowKeyDown(e: React.KeyboardEvent) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) return;
        e.preventDefault();
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleChannelClick(e: React.MouseEvent) {
        e.stopPropagation();
        navigate(ROUTES.CHANNEL.replace(':id', video.channelId));
    }

    function handleChannelKeyDown(e: React.KeyboardEvent) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) return;
        e.preventDefault();
        e.stopPropagation();
        navigate(ROUTES.CHANNEL.replace(':id', video.channelId));
    }

    function handleTagClick(e: React.MouseEvent, tag: string) {
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    const { visible: visibleTags, extra: extraTagCount } = getVisibleTags(video.tags);
    const hasExtraTags = extraTagCount > 0;

    return (
        <article
            className={rowClass}
            tabIndex={0}
            onClick={handleRowClick}
            onKeyDown={handleRowKeyDown}
            style={{ '--vr-color': palette.color, '--vr-bg': palette.bg } as React.CSSProperties}
        >
            <div className="video-row__thumb">
                <img
                    className="video-row__thumb-img"
                    src={video.thumbnail}
                    alt={video.title}
                    loading="lazy"
                />
                <div className="video-row__play-overlay" aria-hidden="true">
                    <svg className="video-row__play-icon" viewBox="0 0 24 24" fill="white">
                        <polygon points="6,3 20,12 6,21" />
                    </svg>
                </div>
                <VideoStatusBadges
                    isScheduledAndFuture={isScheduledAndFuture}
                    isNew={isNew}
                    isWatched={isWatched}
                    classPrefix="video-row"
                />
            </div>

            <div className="video-row__body">
                <p className="video-row__title">{video.title}</p>

                {video.description && (
                    <p className="video-row__description">{video.description}</p>
                )}

                <div className="video-row__meta">
                    <span
                        className="video-row__meta-channel"
                        role="button"
                        tabIndex={0}
                        onClick={handleChannelClick}
                        onKeyDown={handleChannelKeyDown}
                    >
                        {video.channel}
                    </span>
                    <div className="video-row__meta-sub">
                        <span className="video-row__meta-views">{Format.views(video.views)} {t('video.views')}</span>
                        <span className="video-row__meta-dot" aria-hidden="true">·</span>
                        <span className="video-row__meta-date">{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                    </div>
                </div>

                <div className="video-row__tags">
                    {visibleTags.map(tag => (
                        <TagBadge
                            key={tag}
                            tag={tag}
                            className="video-row__tag"
                            onClick={handleTagClick}
                        />
                    ))}
                    {hasExtraTags && (
                        <span className="video-row__tags-more">+{extraTagCount}</span>
                    )}
                </div>
            </div>
        </article>
    );
});

export default VideoRow;
