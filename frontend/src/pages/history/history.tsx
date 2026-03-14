import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Trash2, X } from 'lucide-react';
import VideoRow from '@components/video/row';
import { useVideo } from '@context/useVideo';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import './history.css';

interface HistoryGroup {
    label: string
    ids: string[]
}

function getGroupLabel(dateStr: string, t: (k: string) => string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const isToday = date >= todayStart;
    const isYesterday = date >= yesterdayStart && date < todayStart;
    const isThisWeek = date >= weekStart && date < yesterdayStart;

    if (isToday) {
        return t('history.group_today');
    }

    if (isYesterday) {
        return t('history.group_yesterday');
    }

    if (isThisWeek) {
        return t('history.group_this_week');
    }
    return t('history.group_older');
}

export default function HistoryPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { watchHistory, videos, removeFromHistory, clearHistory } = useVideo();

    const videoMap = useMemo(() => {
        const map = new Map(videos.map(v => [v.id, v]));
        return map;
    }, [videos]);

    const groups = useMemo<HistoryGroup[]>(() => {
        const result: HistoryGroup[] = [];
        const seenLabels = new Map<string, HistoryGroup>();

        for (const id of watchHistory) {
            const video = videoMap.get(id);
            if (!video) {
                continue;
            }
            const label = getGroupLabel(video.publishedAt, t);
            const existing = seenLabels.get(label);
            if (existing) {
                existing.ids.push(id);
            } else {
                const group: HistoryGroup = { label, ids: [id] };
                result.push(group);
                seenLabels.set(label, group);
            }
        }

        return result;
    }, [watchHistory, videoMap, t]);

    const hasHistory = watchHistory.length > 0;

    function handleRemoveFromHistory(id: string) {
        removeFromHistory(id);
        dispatch(toastActions.addToast({ message: t('toast.history_removed'), type: 'info' }));
    }

    function handleClearHistory() {
        clearHistory();
        dispatch(toastActions.addToast({ message: t('toast.history_cleared'), type: 'info' }));
    }

    return (
        <div className="history-page">
            <div className="history-page__header">
                <h1 className="history-page__title">{t('nav.history')}</h1>
                {hasHistory && (
                    <Tooltip content={t('history.clear_all')} side="bottom">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="history-page__clear-btn"
                            onClick={handleClearHistory}
                            aria-label={t('history.clear_all')}
                        >
                            <Trash2 size={14} strokeWidth={2} />
                            {t('history.clear_all')}
                        </Button>
                    </Tooltip>
                )}
            </div>

            {hasHistory ? (
                <div className="history-page__content">
                    {groups.map(group => (
                        <div key={group.label} className="history-page__group">
                            <h2 className="history-page__group-label">{group.label}</h2>
                            <div className="history-page__group-list">
                                {group.ids.map(id => {
                                    const video = videoMap.get(id);
                                    if (!video) {
                                        return null;
                                    }
                                    return (
                                        <div key={id} className="history-page__item">
                                            <VideoRow video={video} />
                                            <Tooltip content={t('history.remove')} side="left">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="history-page__remove-btn"
                                                    onClick={() => handleRemoveFromHistory(id)}
                                                    aria-label={t('history.remove')}
                                                >
                                                    <X size={14} strokeWidth={2} />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="history-page__empty">
                    <History size={40} strokeWidth={1.25} className="history-page__empty-icon" />
                    <p className="history-page__empty-title">{t('nav.history')}</p>
                    <p className="history-page__empty-text">{t('video.no_history_title')}</p>
                </div>
            )}
        </div>
    );
}
