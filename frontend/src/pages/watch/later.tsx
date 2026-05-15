import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMediaQuery } from '@hooks/useMediaQuery';
import { Clock, X } from 'lucide-react';
import VideoActionCard from '@components/video/actionCard';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import { useVideo } from '@hooks/useVideo';
import { usePlaylist } from '@hooks/usePlaylist';
import { useAppDispatch, useAppSelector } from '@store';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import { selectWatchLaterIds } from '@store/playlistSlice';
import { PLAYLIST_CONSTANTS } from '@models/playlist';
import { toastActions } from '@store/toastSlice';
import { VideoFilter } from '@utils/applyFilters';
import type { Video } from '@models/video';
import type { Tag } from '@models/tag';
import './later.css';
import { ToastType } from '@enums/toastType';

// eslint-disable-next-line complexity
export default function WatchLaterPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { videos } = useVideo();
    const { playlists, removeVideoFromPlaylist } = usePlaylist();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);

    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    const watchLaterList = useMemo(
        () => videos.filter((v: Video) => watchLaterIds.has(v.id as string)),
        [videos, watchLaterIds],
    );

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const v of watchLaterList) {
            for (const tag of v.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort() as unknown as Tag[];
    }, [watchLaterList]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(watchLaterList, filters),
        [watchLaterList, filters],
    );

    const isBootstrapping = videos.length === 0;
    const hasVideos = watchLaterList.length > 0;
    const hasResults = filteredVideos.length > 0;
    const isTouchDevice = useMediaQuery('(hover: none)');

    function handleRemove(videoId: string) {
        const watchLater = playlists.find(p => p.name === PLAYLIST_CONSTANTS.WATCH_LATER);
        const hasWatchLater = watchLater !== undefined;

        if (!hasWatchLater) {
            return;
        }

        removeVideoFromPlaylist(watchLater.id as string, videoId);
        dispatch(toastActions.addToast({ message: t('toast.unsaved'), type: ToastType.INFO }));
    }

    if (isBootstrapping) {
        return (
            <div className="watch-later-page">
                <div className="watch-later-page__grid">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="watch-later-page">
            <div className="watch-later-page__header">
                <h1 className="watch-later-page__title">{t('nav.watch_later')}</h1>
                {hasVideos && (
                    <p className="watch-later-page__count">
                        {t('video.videos_count', { count: watchLaterList.length })}
                    </p>
                )}
            </div>

            {hasVideos && (
                <div className="watch-later-page__filters">
                    <FilterPanel allTags={allTags} value={filters} onChange={setFilters} />
                </div>
            )}

            {!hasVideos && (
                <div className="watch-later-page__empty">
                    <Clock size={40} strokeWidth={1.25} className="watch-later-page__empty-icon" />
                    <p className="watch-later-page__empty-title">{t('nav.watch_later')}</p>
                    <p className="watch-later-page__empty-text">{t('watch_later.empty_text')}</p>
                </div>
            )}
            {hasVideos && !hasResults && (
                <div className="watch-later-page__empty">
                    <Clock size={40} strokeWidth={1.25} className="watch-later-page__empty-icon" />
                    <p className="watch-later-page__empty-title">{t('video.no_results')}</p>
                    <p className="watch-later-page__empty-text">{t('video.filter_clear')}</p>
                </div>
            )}
            {hasVideos && hasResults && (
                <div className="watch-later-page__grid">
                    {filteredVideos.map((video, i) => (
                        <VideoActionCard
                            key={video.id}
                            video={video}
                            index={i}
                            actionIcon={<X size={14} strokeWidth={2} />}
                            actionLabel={t('watch_later.remove')}
                            itemClass="watch-later-page__item"
                            btnClass={['watch-later-page__remove-btn', isTouchDevice ? 'watch-later-page__remove-btn--touch' : ''].filter(Boolean).join(' ')}
                            onAction={handleRemove}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
