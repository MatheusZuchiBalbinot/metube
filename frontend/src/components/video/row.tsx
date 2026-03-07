import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VideoStatus, type Video } from '@data/mockVideos';
import { ROUTES } from '@utils/routes';
import { Format } from '@utils/format';
import { TagColors } from '@utils/tagColors';
import { useVideo } from '@context/useVideo';
import Badge from '@ui/badge/badge';
import './row.css';

interface VideoRowProps {
    video: Video
    highlighted?: boolean
}

export default function VideoRow({ video, highlighted = false }: VideoRowProps) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { openTagView } = useVideo();

    const palette = TagColors.palette(video.tags[0] ?? video.id);

    const now = new Date();
    const isScheduledAndFuture =
        video.status === VideoStatus.SCHEDULED &&
        video.scheduledAt !== undefined &&
        new Date(video.scheduledAt) > now;

    const rowClass = ['video-row', highlighted ? 'video-row--highlighted' : '']
        .filter(Boolean)
        .join(' ');

    function handleRowClick() {
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleTagClick(e: React.MouseEvent, tag: string) {
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    const visibleTags = video.tags.slice(0, 3);
    const extraTagCount = video.tags.length - 3;
    const hasExtraTags = extraTagCount > 0;

    return (
        <div
            className={rowClass}
            onClick={handleRowClick}
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
                {isScheduledAndFuture && (
                    <div className="video-row__badge-overlay">
                        <Badge variant="warning">{t('video.scheduled')}</Badge>
                    </div>
                )}
            </div>

            <div className="video-row__body">
                <p className="video-row__title">{video.title}</p>

                {video.description && (
                    <p className="video-row__description">{video.description}</p>
                )}

                <div className="video-row__meta">
                    <span className="video-row__meta-channel">{video.channel}</span>
                    <div className="video-row__meta-sub">
                        <span className="video-row__meta-views">{Format.views(video.views)} {t('video.views')}</span>
                        <span className="video-row__meta-dot" aria-hidden="true">·</span>
                        <span className="video-row__meta-date">{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                    </div>
                </div>

                <div className="video-row__tags">
                    {visibleTags.map(tag => {
                        const tagPalette = TagColors.palette(tag);
                        return (
                            <span
                                key={tag}
                                className="video-row__tag"
                                style={{ background: tagPalette.bg, color: tagPalette.color }}
                                role="button"
                                onClick={e => handleTagClick(e, tag)}
                            >
                                {tag}
                            </span>
                        );
                    })}
                    {hasExtraTags && (
                        <span className="video-row__tags-more">+{extraTagCount}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
