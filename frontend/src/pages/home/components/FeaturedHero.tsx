import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Play } from 'lucide-react';
import { Format, videoUrl } from '@utils';
import type { Video } from '@models';

interface FeaturedHeroProps {
    video: Video;
}

export default function FeaturedHero({ video }: FeaturedHeroProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();

    function handlePlay() {
        navigate(videoUrl(video.id));
    }

    return (
        <button type="button" className="home-hero" onClick={handlePlay}>
            <img className="home-hero__bg" src={video.thumbnail} alt="" aria-hidden="true" />
            <div className="home-hero__scrim" />
            <div className="home-hero__content">
                <span className="home-hero__eyebrow">{t('home.featured')}</span>
                <h2 className="home-hero__title">{video.title}</h2>
                <p className="home-hero__meta">
                    {video.channel} · {Format.views(video.views)} {t('video.views')}
                </p>
                {video.description && (
                    <p className="home-hero__desc">{video.description}</p>
                )}
                <span className="home-hero__play">
                    <Play size={16} strokeWidth={2.5} />
                    {t('player.play')}
                </span>
            </div>
        </button>
    );
}
