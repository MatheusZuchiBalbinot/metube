import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@store';
import { playbackActions } from '@store/playbackSlice';
import type { VideoId } from '@models';

/**
 * Playback preferences (autoplay, pinned video, shorts volume/mute, theater mode)
 * from the `playback` slice, plus their stable setters.
 */
export function usePlaybackPrefs() {
    const dispatch = useAppDispatch();

    const pinnedVideoId = useAppSelector(s => s.playback.pinnedVideoId);
    const autoplay = useAppSelector(s => s.playback.autoplay);
    const shortsMuted = useAppSelector(s => s.playback.shortsMuted);
    const shortsVolume = useAppSelector(s => s.playback.shortsVolume);
    const theaterMode = useAppSelector(s => s.playback.theaterMode);

    const setAutoplay = useCallback(
        (value: boolean) => dispatch(playbackActions.setAutoplay(value)),
        [dispatch],
    );
    const pinVideo = useCallback(
        (id: VideoId) => dispatch(playbackActions.pinVideo(id)),
        [dispatch],
    );
    const unpinVideo = useCallback(
        () => dispatch(playbackActions.unpinVideo()),
        [dispatch],
    );
    const setShortsMuted = useCallback(
        (muted: boolean) => dispatch(playbackActions.setShortsMuted(muted)),
        [dispatch],
    );
    const setShortsVolume = useCallback(
        (volume: number) => dispatch(playbackActions.setShortsVolume(volume)),
        [dispatch],
    );
    const toggleTheaterMode = useCallback(
        () => dispatch(playbackActions.setTheaterMode(!theaterMode)),
        [dispatch, theaterMode],
    );

    return {
        pinnedVideoId,
        autoplay,
        shortsMuted,
        shortsVolume,
        theaterMode,
        setAutoplay,
        pinVideo,
        unpinVideo,
        setShortsMuted,
        setShortsVolume,
        toggleTheaterMode,
    };
}
