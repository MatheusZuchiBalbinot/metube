// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useShortsData } from '@pages/shorts/hooks/useShortsData';
import videoSlice from '@store/videoSlice';
import videoUiSlice from '@store/videoUiSlice';
import playbackSlice from '@store/playbackSlice';
import { makeVideo, makeVideoState, makeVideoUiState, makePlaybackState, vid, tag } from '../../../helpers/factories';

function makeStore(overrides: { video?: object; videoUi?: object; playback?: object } = {}) {
    return configureStore({
        reducer: {
            video: videoSlice.reducer,
            videoUi: videoUiSlice.reducer,
            playback: playbackSlice.reducer,
        },
        preloadedState: {
            video: makeVideoState(overrides.video ?? {}),
            videoUi: makeVideoUiState(overrides.videoUi ?? {}),
            playback: makePlaybackState(overrides.playback ?? {}),
        },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

describe('useShortsData', () => {
    it('filters published videos down to those tagged "shorts"', () => {
        const videos = [
            makeVideo({ id: vid('v1'), tags: [tag('shorts')] }),
            makeVideo({ id: vid('v2'), tags: [tag('music')] }),
        ];
        const store = makeStore({ video: { videos } });

        const { result } = renderHook(() => useShortsData(), { wrapper: wrapper(store) });

        expect(result.current.shorts.map(v => v.id)).toEqual([vid('v1')]);
    });

    it('exposes shortsMuted/shortsVolume from the playback slice', () => {
        const store = makeStore({ playback: { shortsMuted: false, shortsVolume: 0.4 } });

        const { result } = renderHook(() => useShortsData(), { wrapper: wrapper(store) });

        expect(result.current.muted).toBe(false);
        expect(result.current.volume).toBe(0.4);
    });

    it('setMuted/setVolume dispatch to the playback slice', () => {
        const store = makeStore();
        const { result } = renderHook(() => useShortsData(), { wrapper: wrapper(store) });

        act(() => {
            result.current.setMuted(false);
            result.current.setVolume(0.2);
        });

        expect(store.getState().playback.shortsMuted).toBe(false);
        expect(store.getState().playback.shortsVolume).toBe(0.2);
    });

    it('closes the mini-player on mount', () => {
        const store = makeStore({
            videoUi: { miniPlayer: { videoId: vid('v1'), currentTime: 0, seekSession: 1 } },
        });

        renderHook(() => useShortsData(), { wrapper: wrapper(store) });

        expect(store.getState().videoUi.miniPlayer).toBeNull();
    });
});
