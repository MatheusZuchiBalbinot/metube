import { useMemo, useState, useRef } from 'react';
import { useDebounce } from '@hooks/useDebounce';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { History, Search, Trash2, X } from 'lucide-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import VideoRow from '@components/video/row';
import Modal from '@ui/modal/modal';
import { useVideo } from '@hooks/useVideo';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import EmptyState from '@ui/empty/empty';
import type { Video, VideoId } from '@models/video';
import { HistoryPeriod, type HistoryPeriod as HistoryPeriodType } from '@models/history';
import './history.css';

// Estimated heights for virtualizer — group headers are shorter than rows.
const GROUP_HEADER_HEIGHT = 36;
const VIDEO_ROW_HEIGHT = 136;

type FlatItem =
    | { type: 'header'; label: string }
    | { type: 'video'; id: string };

interface HistoryGroup {
    label: string
    ids: string[]
}

const PERIODS: { value: HistoryPeriodType; labelKey: string }[] = [
    { value: HistoryPeriod.ALL, labelKey: 'history.period_all' },
    { value: HistoryPeriod.TODAY, labelKey: 'history.period_today' },
    { value: HistoryPeriod.WEEK, labelKey: 'history.period_week' },
    { value: HistoryPeriod.MONTH, labelKey: 'history.period_month' },
];

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
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    const videoMap = useMemo(() => {
        const map = new Map<string, Video>(videos.map((v: Video) => [v.id as string, v]));
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
    const isTouchDevice = useMediaQuery('(hover: none)');

    // Flatten groups into a single list for the virtualizer.
    const flatItems = useMemo<FlatItem[]>(() => {
        const result: FlatItem[] = [];
        for (const group of groups) {
            result.push({ type: 'header', label: group.label });
            for (const id of group.ids) {
                result.push({ type: 'video', id });
            }
        }
        return result;
    }, [groups]);

    const listRef = useRef<HTMLDivElement>(null);

    /* eslint-disable react-hooks/refs */
    const virtualizer = useWindowVirtualizer({
        count: flatItems.length,
        estimateSize: (i) => {
            const item = flatItems[i];
            return item?.type === 'header' ? GROUP_HEADER_HEIGHT : VIDEO_ROW_HEIGHT;
        },
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });
    /* eslint-enable react-hooks/refs */

    function handleRemoveFromHistory(id: string) {
        removeFromHistory(id as unknown as VideoId);
        dispatch(toastActions.addToast({ message: t('toast.history_removed'), type: 'info' }));
    }

    function handleClearHistoryClick() {
        setIsClearModalOpen(true);
    }

    function handleClearHistoryConfirm() {
        setIsClearModalOpen(false);
        clearHistory();
        dispatch(toastActions.addToast({ message: t('toast.history_cleared'), type: 'info' }));
    }

    function handleClearHistoryCancel() {
        setIsClearModalOpen(false);
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
                <div className="history-page__controls">
                    <div className="history-page__search-wrap">
                        <Search size={14} className="history-page__search-icon" />
                        <input
                            type="text"
                            className="history-page__search"
                            placeholder={t('history.search_placeholder')}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            aria-label={t('history.search_placeholder')}
                        />
                        {searchQuery.length > 0 && (
                            <button
                                className="history-page__search-clear"
                                onClick={() => setSearchQuery('')}
                                aria-label={t('common.close')}
                                type="button"
                            >
                                <X size={12} strokeWidth={2.5} />
                            </button>
                        )}
                    </div>

                    <div className="history-page__periods" role="group" aria-label={t('history.period_label')}>
                        {PERIODS.map(p => {
                            const isActive = selectedPeriod === p.value;
                            return (
                                <button
                                    key={p.value}
                                    type="button"
                                    className={['history-page__period-btn', isActive ? 'history-page__period-btn--active' : ''].filter(Boolean).join(' ')}
                                    onClick={() => setSelectedPeriod(p.value)}
                                    aria-pressed={isActive}
                                >
                                    {t(p.labelKey)}
                                </button>
                            );
                        })}
                    </div>
                </div>
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
                <div className="history-page__content" ref={listRef}>
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {virtualizer.getVirtualItems().map(virtualItem => {
                            const item = flatItems[virtualItem.index];
                            return (
                                <div
                                    key={virtualItem.key}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                                    }}
                                >
                                    {item.type === 'header' ? (
                                        <h2 className="history-page__group-label">{item.label}</h2>
                                    ) : (
                                        <div className="history-page__item">
                                            <VideoRow video={videoMap.get(item.id)!} />
                                            <Tooltip content={t('history.remove')} side="left">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className={[
                                                        'history-page__remove-btn',
                                                        isTouchDevice ? 'history-page__remove-btn--touch' : '',
                                                    ].filter(Boolean).join(' ')}
                                                    onClick={() => handleRemoveFromHistory(item.id)}
                                                    aria-label={t('history.remove')}
                                                >
                                                    <X size={14} strokeWidth={2} />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <Modal
                isOpen={isClearModalOpen}
                onClose={handleClearHistoryCancel}
                title={t('history.clear_confirm_title')}
                size="sm"
                footer={
                    <div className="history-page__modal-footer">
                        <Button variant="ghost" onClick={handleClearHistoryCancel}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="danger" onClick={handleClearHistoryConfirm}>
                            {t('history.clear_confirm_action')}
                        </Button>
                    </div>
                }
            >
                <p className="history-page__modal-body">{t('history.clear_confirm_text')}</p>
            </Modal>
        </div>
    );
}
