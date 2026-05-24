import { Format } from '@utils';
import type { Video, VideoId } from '@models';

interface ProfileDiamondTiersProps {
    videos: Video[]
    onNavigate: (id: VideoId) => void
}

export default function ProfileDiamondTiers({ videos, onNavigate }: ProfileDiamondTiersProps) {
    return (
        <div className="profile-page__diamond-tiers">
            <div className="profile-page__diamond-tier">
                <div
                    className="profile-page__diamond"
                    style={{ backgroundImage: `url(${videos[0].thumbnail})` }}
                    role="button"
                    tabIndex={0}
                    onClick={() => onNavigate(videos[0].id)}
                    onKeyDown={e => e.key === 'Enter' && onNavigate(videos[0].id)}
                >
                    <div className="profile-page__diamond-overlay">
                        <div className="profile-page__diamond-info">
                            <span className="profile-page__diamond-rank">#1</span>
                            <span className="profile-page__diamond-title">{videos[0].title}</span>
                            <span className="profile-page__diamond-views">{Format.views(videos[0].views)}</span>
                        </div>
                    </div>
                </div>
            </div>
            {videos.length >= 3 && (
                <div className="profile-page__diamond-tier">
                    {videos.slice(1, 3).map((video, i) => (
                        <div
                            key={video.id}
                            className="profile-page__diamond"
                            style={{ backgroundImage: `url(${video.thumbnail})` }}
                            role="button"
                            tabIndex={0}
                            onClick={() => onNavigate(video.id)}
                            onKeyDown={e => e.key === 'Enter' && onNavigate(video.id)}
                        >
                            <div className="profile-page__diamond-overlay">
                                <div className="profile-page__diamond-info">
                                    <span className="profile-page__diamond-rank">#{i + 2}</span>
                                    <span className="profile-page__diamond-title">{video.title}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {videos.length >= 6 && (
                <div className="profile-page__diamond-tier">
                    {videos.slice(3, 6).map((video, i) => (
                        <div
                            key={video.id}
                            className="profile-page__diamond"
                            style={{ backgroundImage: `url(${video.thumbnail})` }}
                            role="button"
                            tabIndex={0}
                            onClick={() => onNavigate(video.id)}
                            onKeyDown={e => e.key === 'Enter' && onNavigate(video.id)}
                        >
                            <div className="profile-page__diamond-overlay">
                                <div className="profile-page__diamond-info">
                                    <span className="profile-page__diamond-rank">#{i + 4}</span>
                                    <span className="profile-page__diamond-title">{video.title}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
