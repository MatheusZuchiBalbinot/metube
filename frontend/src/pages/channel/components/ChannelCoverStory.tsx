import { Eye, Play } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Format, TagColors, formatRelativeDate } from '@utils';
import type { Video, VideoId, Comment } from '@models';

interface ChannelCoverStoryProps {
    featured: Video
    spotlightComments: Comment[]
    onNavigate: (id: VideoId) => void
    onWatchClick: (e: React.MouseEvent) => void
}

export default function ChannelCoverStory({
    featured,
    spotlightComments,
    onNavigate,
    onWatchClick,
}: ChannelCoverStoryProps) {
    const { t } = useTranslation();

    return (
        <div
            className="channel-page__cover"
            style={{ backgroundImage: `url(${featured.thumbnail})` }}
            role="button"
            tabIndex={0}
            aria-label={featured.title}
            onClick={() => onNavigate(featured.id)}
            onKeyDown={e => e.key === 'Enter' && onNavigate(featured.id)}
        >
            <div className="channel-page__cover-content">
                <span className="channel-page__cover-badge">{t('channel.cover_badge')}</span>
                <h2 className="channel-page__cover-title">{featured.title}</h2>
                <div className="channel-page__cover-meta">
                    <Eye size={13} />
                    {Format.views(featured.views)} {t('video.views')}
                    {featured.publishedAt && (
                        <>
                            <span className="channel-page__cover-sep" />
                            {formatRelativeDate(featured.publishedAt)}
                        </>
                    )}
                </div>
                {featured.tags.length > 0 && (
                    <div className="channel-page__cover-tags">
                        {featured.tags.slice(0, 4).map(tag => {
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
                        onClick={onWatchClick}
                    >
                        <Play size={13} fill="currentColor" />
                        {t('video.watch_now')}
                    </button>
                </div>
            </div>
        </div>
    );
}
