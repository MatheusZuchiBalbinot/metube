import { Play, Clock, Heart, Tag as TagIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TagColors } from '@utils';
import type { Tag } from '@models';

interface ProfileStatsData {
    videosWatched: number
    watchTimeStr: string
    likedCount: number
    topTags: Tag[]
}

interface ProfileStatsProps {
    stats: ProfileStatsData
}

export default function ProfileStats({ stats }: ProfileStatsProps) {
    const { t } = useTranslation();

    return (
        <div className="profile-page__stats-grid">
            <div className="profile-page__stat">
                <Play size={13} className="profile-page__stat-icon" />
                <span className="profile-page__stat-value">{stats.videosWatched}</span>
                <span className="profile-page__stat-label">{t('profile.videos_watched')}</span>
            </div>
            <div className="profile-page__stat">
                <Clock size={13} className="profile-page__stat-icon" />
                <span className="profile-page__stat-value">{stats.watchTimeStr}</span>
                <span className="profile-page__stat-label">{t('profile.watch_time')}</span>
            </div>
            <div className="profile-page__stat">
                <Heart size={13} className="profile-page__stat-icon" />
                <span className="profile-page__stat-value">{stats.likedCount}</span>
                <span className="profile-page__stat-label">{t('profile.liked_count')}</span>
            </div>
            {stats.topTags.length > 0 && (
                <div className="profile-page__stat profile-page__stat--tags">
                    <TagIcon size={13} className="profile-page__stat-icon" />
                    <div className="profile-page__top-tags">
                        {stats.topTags.map(tag => {
                            const palette = TagColors.palette(tag);
                            return (
                                <span
                                    key={tag}
                                    className="profile-page__top-tag"
                                    style={{ background: palette.bg, color: palette.color }}
                                >
                                    {tag}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
