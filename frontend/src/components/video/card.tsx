import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VideoStatus, type Video } from '@data/mockVideos';
import { ROUTES } from '@utils/routes';
import { Format } from '@utils/format';
import { TagColors } from '@utils/tagColors';
import { useVideo } from '@context/useVideo';
import Badge from '@ui/badge/badge';
import Button from '@ui/button/button';
import './card.css';

interface VideoCardProps {
    video: Video
    showActions?: boolean
    onEdit?: (video: Video) => void
    onDelete?: (id: string) => void
}

function buildVideoCardClass(showActions: boolean) {
    return ['video-card', showActions ? 'video-card--with-actions' : '']
        .filter(Boolean)
        .join(' ');
}

export default function VideoCard({
    video,
    showActions = false,
    onEdit,
    onDelete,
}: VideoCardProps) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { openTagView } = useVideo();

    const palette = TagColors.palette(video.tags[0] ?? video.id);
    const visibleTags = video.tags.slice(0, 3);
    const extraTagCount = video.tags.length - 3;
    const hasExtraTags = extraTagCount > 0;

    const now = new Date();
    const isScheduledAndFuture =
        video.status === VideoStatus.SCHEDULED &&
        video.scheduledAt !== undefined &&
        new Date(video.scheduledAt) > now;

    function handleCardClick() {
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleEdit(e: React.MouseEvent) {
        e.stopPropagation();
        onEdit?.(video);
    }

    function handleDelete(e: React.MouseEvent) {
        e.stopPropagation();
        onDelete?.(video.id);
    }

    function handleTagClick(e: React.MouseEvent, tag: string) {
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    return (
        <div
            className={buildVideoCardClass(showActions)}
            onClick={handleCardClick}
            style={{ '--vc-color': palette.color, '--vc-bg': palette.bg } as React.CSSProperties}
        >
            <div className="video-card__thumb">
                <img
                    className="video-card__thumb-img"
                    src={video.thumbnail}
                    alt={video.title}
                    loading="lazy"
                />
                <div className="video-card__play-overlay" aria-hidden="true">
                    <svg className="video-card__play-icon" viewBox="0 0 24 24" fill="white">
                        <polygon points="6,3 20,12 6,21" />
                    </svg>
                </div>
                {isScheduledAndFuture && (
                    <div className="video-card__badge-overlay">
                        <Badge variant="warning">{t('video.scheduled')}</Badge>
                    </div>
                )}
            </div>

            <div className="video-card__body">
                <p className="video-card__title">{video.title}</p>

                <div className="video-card__meta">
                    <span className="video-card__meta-channel">{video.channel}</span>
                    <div className="video-card__meta-sub">
                        <span className="video-card__meta-views">{Format.views(video.views)} {t('video.views')}</span>
                        <span className="video-card__meta-dot" aria-hidden="true">·</span>
                        <span className="video-card__meta-date">{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                    </div>
                </div>

                <div className="video-card__tags">
                    {visibleTags.map(tag => {
                        const tagPalette = TagColors.palette(tag);
                        return (
                            <span
                                key={tag}
                                className="video-card__tag video-card__tag--clickable"
                                style={{ background: tagPalette.bg, color: tagPalette.color }}
                                role="button"
                                onClick={e => handleTagClick(e, tag)}
                            >
                                {tag}
                            </span>
                        );
                    })}
                    {hasExtraTags && (
                        <span className="video-card__tags-more">+{extraTagCount}</span>
                    )}
                </div>

                {showActions && (
                    <div className="video-card__actions">
                        <Button variant="ghost" size="sm" onClick={handleEdit}>
                            {t('video.edit')}
                        </Button>
                        <Button variant="danger" size="sm" onClick={handleDelete}>
                            {t('video.delete')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
