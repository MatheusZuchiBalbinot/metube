import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, X } from 'lucide-react';
import VideoActionCard from '@components/video/actionCard';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import { useAppDispatch, useAppSelector } from '@store';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import { selectWatchLaterIds } from '@store/playlistSlice';
import { domain } from '@domain';
import { toastActions } from '@store/toastSlice';
import { VideoFilter, cn } from '@utils';
import './later.css';
import { ToastType } from '@enums/toastType';
import { useMediaQuery, useVideo, usePlaylist } from '@hooks';
import type { Video, VideoId, Tag } from '@models';

// eslint-disable-next-line complexity
export default function WatchLaterPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { videos } = useVideo();
    const { playlists, removeVideoFromPlaylist } = usePlaylist();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);

    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());

    const watchLaterList = useMemo(
        () => videos.filter((v: Video) => watchLaterIds.has(v.id)),
        [videos, watchLaterIds],
    );

    const allTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const video of watchLaterList) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }, [watchLaterList]);

    const filteredVideos = useMemo(
        () => VideoFilter.apply(watchLaterList, filters),
        [watchLaterList, filters],
    );

    const isBootstrapping = videos.length === 0;
    const hasVideos = watchLaterList.length > 0;
    const hasResults = filteredVideos.length > 0;
    const isTouchDevice = useMediaQuery('(hover: none)');

    function handleRemove(videoId: VideoId) {
        const watchLater = playlists.find(p => domain.playlist.isWatchLater(p));
        const hasWatchLater = watchLater !== undefined;

        if (!hasWatchLater) {
            return;
        }

        removeVideoFromPlaylist(watchLater.id, videoId);
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
                            btnClass={cn('watch-later-page__remove-btn', isTouchDevice && 'watch-later-page__remove-btn--touch')}
                            onAction={handleRemove}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
