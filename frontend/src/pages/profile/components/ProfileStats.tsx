import { useTranslation } from 'react-i18next';
import { Format } from '@utils';
import type { ViewCount } from '@models';

interface ProfileStatsData {
    totalViews: number
    uploadsThisMonth: number
    subscriberCount: number
    publishedCount: number
    totalCount: number
}

interface ProfileStatsProps {
    stats: ProfileStatsData
}

interface StatCellProps {
    label: string
    value: string | number
    note?: string
}

function StatCell({ label, value, note }: StatCellProps) {
    return (
        <div className="profile-page__stat">
            <span className="profile-page__stat-label">{label}</span>
            <span className="profile-page__stat-value">{value}</span>
            {note && <span className="profile-page__stat-note">{note}</span>}
        </div>
    );
}

export default function ProfileStats({ stats }: ProfileStatsProps) {
    const { t } = useTranslation();
    const pendingCount = stats.totalCount - stats.publishedCount;

    return (
        <div className="profile-page__stats-grid">
            <StatCell
                label={t('profile.total_views')}
                value={Format.views(stats.totalViews as unknown as ViewCount)}
                note={t('profile.stat_all_time')}
            />
            <StatCell
                label={t('profile.subscriber_count')}
                value={stats.subscriberCount}
            />
            <StatCell
                label={t('profile.uploads_this_month')}
                value={stats.uploadsThisMonth}
                note={pendingCount > 0 ? t('profile.stat_pending_note', { count: pendingCount }) : undefined}
            />
            <StatCell
                label={t('profile.published_count')}
                value={stats.publishedCount}
                note={t('profile.stat_published_note', { count: stats.totalCount })}
            />
        </div>
    );
}
