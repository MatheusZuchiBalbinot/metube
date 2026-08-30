import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, X } from 'lucide-react';
import VideoActionCard from '@components/video/actionCard';
import type { FilterState } from '@components/filter/panel';
import VideoGridPage from '@components/layout/videoGridPage';
import { useAppDispatch, useAppSelector } from '@store';
import { selectWatchLaterIds } from '@store/playlistSelectors';
import { domain } from '@domain';
import { toastActions } from '@store/toastSlice';
import { VideoFilter, cn } from '@utils';
import './later.css';
import { ToastType } from '@enums/toastType';
import { useMediaQuery, useVideoData, usePlaylist } from '@hooks';
import type { Video, VideoId } from '@models';

export default function WatchLaterPage() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { videos } = useVideoData();
    const { playlists, removeVideoFromPlaylist } = usePlaylist();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);

    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());
    const isTouchDevice = useMediaQuery('(hover: none)');

    const watchLaterList = useMemo(
        () => videos.filter((v: Video) => watchLaterIds.has(v.id)),
        [videos, watchLaterIds],
    );

    const isBootstrapping = videos.length === 0;

    function handleRemove(videoId: VideoId) {
        const watchLater = playlists.find(p => domain.playlist.isWatchLater(p));
        const hasWatchLater = watchLater !== undefined;

        if (!hasWatchLater) {
            return;
        }

        removeVideoFromPlaylist(watchLater.id, videoId);
        dispatch(toastActions.addToast({ message: t('toast.unsaved'), type: ToastType.INFO }));
    }

    return (
        <VideoGridPage
            title={t('nav.watch_later')}
            videos={watchLaterList}
            filters={filters}
            onFiltersChange={setFilters}
            loading={isBootstrapping}
            emptyIcon={<Clock size={40} strokeWidth={1.25} />}
            emptyDescription={t('watch_later.empty_text')}
            renderItem={(video, i) => (
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
            )}
        />
    );
}
