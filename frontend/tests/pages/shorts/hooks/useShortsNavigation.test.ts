// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useShortsNavigation } from '@pages/shorts/hooks/useShortsNavigation';
import videoSlice from '@store/videoSlice';
import { selectAllVideos } from '@store/videoSelectors';
import { makeVideo, makeVideoState, vid } from '../../../helpers/factories';

const recordViewSpy = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const hasViewedSpy = vi.hoisted(() => vi.fn().mockReturnValue(false));
const markViewedSpy = vi.hoisted(() => vi.fn());

vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        video: { recordView: recordViewSpy },
        toVuid: (id: string) => id,
    };
});
vi.mock('@utils', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        hasViewed: hasViewedSpy,
        markViewed: markViewedSpy,
    };
});

function makeStore(videos = [makeVideo({ id: vid('s0') }), makeVideo({ id: vid('s1') })]) {
    return configureStore({
        reducer: { video: videoSlice.reducer },
        preloadedState: { video: makeVideoState({ videos }) },
    });
}

function wrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(Provider, { store }, children);
    };
}

function makeVideoEl() {
    const el = document.createElement('video');
    el.play = vi.fn().mockResolvedValue(undefined);
    el.pause = vi.fn();
    return el;
}

describe('useShortsNavigation', () => {
    beforeEach(() => {
        recordViewSpy.mockClear();
        hasViewedSpy.mockReturnValue(false);
        markViewedSpy.mockClear();
    });

    function setup(shorts = [makeVideo({ id: vid('s0') }), makeVideo({ id: vid('s1') })]) {
        const store = makeStore(shorts);
        const videoMap = { current: new Map<number, HTMLVideoElement>([[0, makeVideoEl()], [1, makeVideoEl()]]) };
        const itemRefs = { current: [document.createElement('div'), document.createElement('div')] };
        const { result } = renderHook(
            () => useShortsNavigation(shorts, videoMap, itemRefs),
            { wrapper: wrapper(store) },
        );
        return { store, videoMap, itemRefs, result };
    }

    it('starts at renderedIndex 0', () => {
        const { result } = setup();
        expect(result.current.renderedIndex).toBe(0);
    });

    it('activateIndex plays the target video and pauses the others', () => {
        const { videoMap, result } = setup();

        act(() => {
            result.current.activateIndex(1);
        });

        expect(videoMap.current.get(1)?.play).toHaveBeenCalled();
        expect(videoMap.current.get(0)?.pause).toHaveBeenCalled();
        expect(result.current.renderedIndex).toBe(1);
    });

    it('marks the short as viewed and increments views the first time it activates', () => {
        const { store, result } = setup();

        act(() => {
            result.current.activateIndex(0);
        });

        expect(markViewedSpy).toHaveBeenCalledWith(vid('s0'));
        expect(recordViewSpy).toHaveBeenCalledWith('s0');
        expect(selectAllVideos({ video: store.getState().video }).find(v => v.id === vid('s0'))?.views).toBe(1001);
    });

    it('does not record a view again once already viewed', () => {
        hasViewedSpy.mockReturnValue(true);
        const { result } = setup();

        act(() => {
            result.current.activateIndex(0);
        });

        expect(markViewedSpy).not.toHaveBeenCalled();
        expect(recordViewSpy).not.toHaveBeenCalled();
    });

    it('is a no-op when re-activating the already-active, already-playing index', () => {
        const { videoMap, result } = setup();

        act(() => {
            result.current.activateIndex(0);
        });
        vi.mocked(videoMap.current.get(0)!.play).mockClear();
        Object.defineProperty(videoMap.current.get(0)!, 'paused', { value: false, configurable: true });

        act(() => {
            result.current.activateIndex(0);
        });

        expect(videoMap.current.get(0)?.play).not.toHaveBeenCalled();
    });

    it('scrollToIndex scrolls the target item into view', () => {
        const { itemRefs, result } = setup();
        itemRefs.current[1]!.scrollIntoView = vi.fn();

        act(() => {
            result.current.scrollToIndex(1);
        });

        expect(itemRefs.current[1]!.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
    });

    it('scrollToIndex ignores out-of-bounds indexes', () => {
        const { itemRefs, result } = setup();
        itemRefs.current[0]!.scrollIntoView = vi.fn();

        act(() => {
            result.current.scrollToIndex(99);
        });

        expect(itemRefs.current[0]!.scrollIntoView).not.toHaveBeenCalled();
    });
});
