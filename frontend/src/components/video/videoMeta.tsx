import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './videoMeta.css';
import { ROUTES, Format, formatRelativeDate, isActivationKey } from '@utils';
import type { Video } from '@models';

type VideoMetaVariant = 'card' | 'row' | 'hero';

interface VideoMetaProps {
    video: Video
    variant: VideoMetaVariant
}

/**
 * Channel + view count + relative publish date, shared by `VideoCard`, `VideoRow`
 * and `VideoHero`. The channel affordance differs per variant (link, keyboard-operable
 * span, or plain text) to preserve each surface's existing interaction model.
 */
export default function VideoMeta({ video, variant }: VideoMetaProps) {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    // Falls back to createdAt so a video missing publishedAt still shows a date,
    // consistently across all three variants.
    const publishedDate = video.publishedAt ?? video.createdAt;

    function handleChannelLinkClick(e: React.MouseEvent) {
        e.stopPropagation();
    }

    function handleChannelClick(e: React.MouseEvent) {
        e.stopPropagation();
        navigate(ROUTES.USER.replace(':id', video.channelId));
    }

    function handleChannelKeyDown(e: React.KeyboardEvent) {
        if (!isActivationKey(e)) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        navigate(ROUTES.USER.replace(':id', video.channelId));
    }

    return (
        <div className={`video-meta video-meta--${variant}`}>
            {variant === 'card' && (
                <Link
                    to={ROUTES.USER.replace(':id', video.channelId)}
                    className="video-meta__channel"
                    onClick={handleChannelLinkClick}
                >
                    {video.channel}
                </Link>
            )}

            {variant === 'row' && (
                <span
                    className="video-meta__channel"
                    role="button"
                    tabIndex={0}
                    onClick={handleChannelClick}
                    onKeyDown={handleChannelKeyDown}
                >
                    {video.channel}
                </span>
            )}

            {variant === 'hero' && (
                <span className="video-meta__channel">{video.channel}</span>
            )}

            <div className="video-meta__sub">
                <span className="video-meta__views">{Format.views(video.views)} {t('video.views')}</span>
                <span className="video-meta__dot" aria-hidden="true">·</span>
                <span className="video-meta__date">{formatRelativeDate(publishedDate, i18n.language)}</span>
            </div>
        </div>
    );
}
