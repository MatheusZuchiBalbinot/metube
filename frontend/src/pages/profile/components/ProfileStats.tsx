import { Eye, Upload, Users, Tag as TagIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Format, TagColors } from '@utils';
import type { Tag } from '@models';

interface ProfileStatsData {
    totalViews: number
    uploadsThisMonth: number
    subscriberCount: number
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
                <Eye size={13} className="profile-page__stat-icon" />
                <span className="profile-page__stat-value">{Format.views(stats.totalViews)}</span>
                <span className="profile-page__stat-label">{t('profile.total_views')}</span>
            </div>
            <div className="profile-page__stat">
                <Users size={13} className="profile-page__stat-icon" />
                <span className="profile-page__stat-value">{stats.subscriberCount}</span>
                <span className="profile-page__stat-label">{t('profile.subscriber_count')}</span>
            </div>
            <div className="profile-page__stat">
                <Upload size={13} className="profile-page__stat-icon" />
                <span className="profile-page__stat-value">{stats.uploadsThisMonth}</span>
                <span className="profile-page__stat-label">{t('profile.uploads_this_month')}</span>
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
