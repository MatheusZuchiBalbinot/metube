import { memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { domain } from '@domain';
import { analytics, toVuid, AnalyticsSource } from '@api';
import TagBadge from '@components/tag/badge';
import VideoStatusBadges from './statusBadges';
import './row.css';
import { useVideoData, useVideoUi, useTrackImpression } from '@hooks';
import { ROUTES, videoUrl, Format, getVisibleTags, TagColors, getSessionId, formatRelativeDate } from '@utils';
import type { Video, Tag } from '@models';

interface VideoRowProps {
    video: Video
    highlighted?: boolean
    source?: AnalyticsSource
    position?: number
}


const VideoRow = memo(function VideoRow({ video, highlighted = false, source = AnalyticsSource.SEARCH, position }: VideoRowProps) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { openTagView } = useVideoUi();
    const { videoProgress } = useVideoData();
    const rowRef = useRef<HTMLElement>(null);
    const vuid = toVuid(video.id);
    const hasValidVuid = vuid !== undefined && vuid !== '';

    useTrackImpression(rowRef, vuid, source, { enabled: hasValidVuid });

    const palette = TagColors.palette(video.tags[0] ?? video.id);

    const isScheduledAndFuture = domain.video.isScheduledAndFuture(video);

    const progress = videoProgress[video.id] ?? 0;
    const isWatched = domain.video.isWatched(progress);

    const rowClass = ['video-row', highlighted ? 'video-row--highlighted' : '']
        .filter(Boolean)
        .join(' ');

    function trackClick() {
        if (!hasValidVuid) {
            return;
        }
        analytics.click({
            vuid,
            source,
            position,
            sessionId: getSessionId(),
        }).catch(() => {});
    }

    function handleRowClick() {
        trackClick();
        navigate(videoUrl(video.id));
    }

    function handleRowKeyDown(e: React.KeyboardEvent) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) {
            return;
        }
        e.preventDefault();
        trackClick();
        navigate(videoUrl(video.id));
    }

    function handleChannelClick(e: React.MouseEvent) {
        e.stopPropagation();
        navigate(ROUTES.USER.replace(':id', video.channelId));
    }

    function handleChannelKeyDown(e: React.KeyboardEvent) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        navigate(ROUTES.USER.replace(':id', video.channelId));
    }

    function handleTagClick(e: React.MouseEvent | React.KeyboardEvent, tag: Tag) {
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    const { visible: visibleTags, extra: extraTagCount } = getVisibleTags(video.tags);
    const hasExtraTags = extraTagCount > 0;

    return (
        <article
            ref={rowRef}
            className={rowClass}
            role="button"
            aria-label={video.title}
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
                    isWatched={isWatched}
                    isProcessing={domain.video.isProcessing(video)}
                    isFailed={domain.video.isFailed(video)}
                    classPrefix="video-row"
                />
            </div>

            <div className="video-row__body">
                <p className="video-row__title">{video.title}</p>


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
                        <span className="video-row__meta-date">{formatRelativeDate(video.publishedAt, i18n.language)}</span>
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
