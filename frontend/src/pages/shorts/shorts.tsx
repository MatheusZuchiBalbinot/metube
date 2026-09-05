import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Clapperboard } from '@components/icons/icons';
import { useAppSelector } from '@store';
import { selectWatchLaterIds } from '@store/playlistSelectors';
import './shorts.css';
import { useShortsData } from './hooks/useShortsData';
import { useShortsRefs } from './hooks/useShortsRefs';
import { useShortsNavigation } from './hooks/useShortsNavigation';
import { useShortsFeedObserver } from './hooks/useShortsFeedObserver';
import ShortsItem from './components/ShortsItem';

export default function ShortsPage() {
    const { t } = useTranslation();
    const watchLaterIds = useAppSelector(selectWatchLaterIds);
    const { shorts, muted, volume, setMuted, setVolume } = useShortsData();
    const { itemRefs, videoMap, getVideoRef, mountVideo } = useShortsRefs();
    const { renderedIndex, activateIndex, scrollToIndex } = useShortsNavigation(shorts, videoMap, itemRefs);
    const feedRef = useRef<HTMLDivElement>(null);
    useShortsFeedObserver(feedRef, itemRefs, activateIndex, shorts.length);

    const isEmpty = shorts.length === 0;

    if (isEmpty) {
        return (
            <div className="shorts-page">
                <div className="shorts-page__empty">
                    <Clapperboard size={48} className="shorts-page__empty-icon" />
                    <p className="shorts-page__empty-title">{t('shorts.empty_title')}</p>
                    <p className="shorts-page__empty-desc">{t('shorts.empty_desc')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="shorts-page">
            <div className="shorts-page__feed" ref={feedRef}>
                {shorts.map((video, index) => {
                    // Mount only the active short and its immediate neighbours so
                    // the rest stay as empty spacer divs (kept for ref/scroll math).
                    const isWithinWindow = Math.abs(index - renderedIndex) <= 1;
                    return (
                        <div
                            key={video.id}
                            ref={el => {
                                itemRefs.current[index] = el;
                            }}
                            style={{ height: '100%' }}
                        >
                            {isWithinWindow && (
                                <ShortsItem
                                    video={video}
                                    index={index}
                                    total={shorts.length}
                                    isActive={index === renderedIndex}
                                    videoRef={getVideoRef(index)}
                                    onVideoMounted={el => mountVideo(index, el)}
                                    onEnded={() => scrollToIndex(index + 1)}
                                    onScrollNext={() => scrollToIndex(index + 1)}
                                    muted={muted}
                                    volume={volume}
                                    onMuteChange={setMuted}
                                    onVolumeChange={setVolume}
                                    watchLaterIds={watchLaterIds}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
