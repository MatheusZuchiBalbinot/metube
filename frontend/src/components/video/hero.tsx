import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { VideoStatus, type Video } from '@data/mockVideos';
import { ROUTES } from '@utils/routes';
import { Format } from '@utils/format';
import { TagColors } from '@utils/tagColors';
import { useVideo } from '@context/useVideo';
import Badge from '@ui/badge/badge';
import './hero.css';

interface VideoHeroProps {
    video: Video
}

export default function VideoHero({ video }: VideoHeroProps) {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { openTagView } = useVideo();

    const palette = TagColors.palette(video.tags[0] ?? video.id);
    const visibleTags = video.tags.slice(0, 5);
    const extraTagCount = video.tags.length - 5;
    const hasExtraTags = extraTagCount > 0;

    const now = new Date();
    const isScheduledAndFuture =
        video.status === VideoStatus.SCHEDULED &&
        video.scheduledAt !== undefined &&
        new Date(video.scheduledAt) > now;

    function handleClick() {
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleTagClick(e: React.MouseEvent, tag: string) {
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    function handleTagKeyDown(e: React.KeyboardEvent, tag: string) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';
        if (!isActivationKey) return;
        e.preventDefault();
        e.stopPropagation();
        openTagView(tag, video.id);
    }

    return (
        <article
            className="video-hero"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(e) => {
                const isActivationKey = e.key === 'Enter' || e.key === ' ';
                if (!isActivationKey) return;
                e.preventDefault();
                handleClick();
            }}
            style={{ '--vh-color': palette.color, '--vh-bg': palette.bg } as React.CSSProperties}
        >
            <div className="video-hero__thumb">
                <img
                    className="video-hero__thumb-img"
                    src={video.thumbnail}
                    alt={video.title}
                    loading="lazy"
                />
                <div className="video-hero__play-overlay" aria-hidden="true">
                    <svg className="video-hero__play-icon" viewBox="0 0 24 24" fill="white">
                        <polygon points="6,3 20,12 6,21" />
                    </svg>
                </div>
                <div className="video-hero__source-badge">
                    <Badge variant="default">{t('tag.fromThisVideo')}</Badge>
                </div>
                {isScheduledAndFuture && (
                    <div className="video-hero__badge-scheduled">
                        <Badge variant="warning">{t('video.scheduled')}</Badge>
                    </div>
                )}
            </div>

            <div className="video-hero__body">
                <p className="video-hero__title">{video.title}</p>

                {video.description && (
                    <p className="video-hero__description">{video.description}</p>
                )}

                <div className="video-hero__meta">
                    <span className="video-hero__meta-channel">{video.channel}</span>
                    <div className="video-hero__meta-sub">
                        <span>{Format.views(video.views)} {t('video.views')}</span>
                        <span className="video-hero__meta-dot" aria-hidden="true">·</span>
                        <span>{Format.relativeDate(video.publishedAt, i18n.language)}</span>
                    </div>
                </div>

                <div className="video-hero__tags">
                    {visibleTags.map(tag => {
                        const tagPalette = TagColors.palette(tag);
                        return (
                            <span
                                key={tag}
                                className="video-hero__tag"
                                style={{ background: tagPalette.bg, color: tagPalette.color }}
                                role="button"
                                tabIndex={0}
                                onClick={e => handleTagClick(e, tag)}
                                onKeyDown={e => handleTagKeyDown(e, tag)}
                            >
                                {tag}
                            </span>
                        );
                    })}
                    {hasExtraTags && (
                        <span className="video-hero__tags-more">+{extraTagCount}</span>
                    )}
                </div>
            </div>
        </article>
    );
}
