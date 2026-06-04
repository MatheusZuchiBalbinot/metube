import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Search, Trash2 } from 'lucide-react';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { videoActions } from '@store/videoSlice';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import EmptyState from '@ui/empty/empty';
import './history.css';
import { ToastType } from '@enums/toastType';
import { HistoryItemKind } from '@enums/historyItemKind';
import { HistoryPeriod, type Video, type VideoId, type HistoryPeriod as HistoryPeriodType } from '@models';
import { useDebounce, useVideo } from '@hooks';
import HistoryControls from './components/HistoryControls';
import HistoryList, { type FlatItem } from './components/HistoryList';

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

function isWithinPeriod(dateStr: string, period: HistoryPeriodType): boolean {
    const isAllPeriod = period === HistoryPeriod.ALL;

    if (isAllPeriod) {
        return true;
    }

    const date = new Date(dateStr);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === HistoryPeriod.TODAY) {
        return date >= todayStart;
    }

    if (period === HistoryPeriod.WEEK) {
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);
        return date >= weekStart;
    }

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= monthStart;
}

// eslint-disable-next-line complexity
export default function HistoryPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { watchHistory, videos, removeFromHistory, clearHistory } = useVideo();

    const [searchQuery, setSearchQuery] = useState('');
    const debouncedSearch = useDebounce(searchQuery, 250);
    const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriodType>(HistoryPeriod.ALL);

    const videoMap = useMemo(() => {
        const map = new Map<VideoId, Video>(videos.map((v: Video) => [v.id, v]));
        return map;
    }, [videos]);

    const groups = useMemo<HistoryGroup[]>(() => {
        const result: HistoryGroup[] = [];
        const seenLabels = new Map<string, HistoryGroup>();
        const normalizedQuery = debouncedSearch.trim().toLowerCase();

        for (const id of watchHistory) {
            const video = videoMap.get(id);

            if (!video || !video.publishedAt) {
                continue;
            }

            const matchesPeriod = isWithinPeriod(video.publishedAt, selectedPeriod);

            if (!matchesPeriod) {
                continue;
            }

            const hasQuery = normalizedQuery.length > 0;
            const matchesSearch = !hasQuery || video.title.toLowerCase().includes(normalizedQuery);

            if (!matchesSearch) {
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
    }, [watchHistory, videoMap, t, debouncedSearch, selectedPeriod]);

    const hasHistory = watchHistory.length > 0;
    const hasResults = groups.length > 0;

    const flatItems = useMemo<FlatItem[]>(() => {
        const result: FlatItem[] = [];

        for (const group of groups) {
            result.push({ type: HistoryItemKind.HEADER, label: group.label });

            for (const id of group.ids) {
                result.push({ type: HistoryItemKind.VIDEO, id });
            }
        }

        return result;
    }, [groups]);

    function handleRemoveFromHistory(id: VideoId) {
        const snapshot = [...watchHistory];
        removeFromHistory(id);
        dispatch(toastActions.addToast({
            message: t('toast.history_removed'),
            type: ToastType.INFO,
            action: {
                label: t('common.undo'),
                onClick: () => dispatch(videoActions.restoreHistory(snapshot)),
            },
            duration: 5000,
        }));
    }

    function handleClearHistoryClick() {
        const snapshot = [...watchHistory];
        clearHistory();
        dispatch(toastActions.addToast({
            message: t('toast.history_cleared'),
            type: ToastType.INFO,
            action: {
                label: t('common.undo'),
                onClick: () => dispatch(videoActions.restoreHistory(snapshot)),
            },
            duration: 5000,
        }));
    }

    function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSearchQuery(e.target.value);
    }

    function handleSearchClear() {
        setSearchQuery('');
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
                            onClick={handleClearHistoryClick}
                            aria-label={t('history.clear_all')}
                        >
                            <Trash2 size={14} strokeWidth={2} />
                            {t('history.clear_all')}
                        </Button>
                    </Tooltip>
                )}
            </div>

            {hasHistory && (
                <HistoryControls
                    searchQuery={searchQuery}
                    selectedPeriod={selectedPeriod}
                    onSearchChange={handleSearchChange}
                    onSearchClear={handleSearchClear}
                    onPeriodChange={setSelectedPeriod}
                />
            )}

            {!hasHistory && (
                <EmptyState
                    icon={<History size={40} strokeWidth={1.25} />}
                    title={t('nav.history')}
                    description={t('video.no_history_title')}
                />
            )}

            {hasHistory && !hasResults && (
                <EmptyState
                    icon={<Search size={40} strokeWidth={1.25} />}
                    title={t('history.no_results_title')}
                    description={t('history.no_results_text')}
                />
            )}

            {hasHistory && hasResults && (
                <HistoryList
                    flatItems={flatItems}
                    videoMap={videoMap}
                    onRemove={handleRemoveFromHistory}
                />
            )}
        </div>
    );
}
