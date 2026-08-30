// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileStats } from '@pages/profile/hooks/useProfileStats';
import { makeVideo, vid, tag } from '../../../helpers/factories';

describe('useProfileStats', () => {
    it('returns null when not the own profile', () => {
        const { result } = renderHook(() => useProfileStats({
            isOwnProfile: false,
            watchHistory: [vid('v1')],
            videoProgress: {},
            videos: [],
            likedVideos: new Set(),
            watchedTagFrequency: new Map(),
        }));

        expect(result.current).toBeNull();
    });

    it('computes videosWatched, watchTimeStr, likedCount and topTags for the own profile', () => {
        const videos = [makeVideo({ id: vid('v1'), duration: 600 })];

        const { result } = renderHook(() => useProfileStats({
            isOwnProfile: true,
            watchHistory: [vid('v1')],
            videoProgress: { [vid('v1')]: 50 },
            videos,
            likedVideos: new Set([vid('v1'), vid('v2')]),
            watchedTagFrequency: new Map([[tag('music'), 3], [tag('gaming'), 1]]),
        }));

        expect(result.current?.videosWatched).toBe(1);
        expect(result.current?.watchTimeStr).toBe('5m');
        expect(result.current?.likedCount).toBe(2);
        expect(result.current?.topTags).toEqual([tag('music'), tag('gaming')]);
    });

    it('formats watch time in hours and minutes once past 60 minutes', () => {
        const videos = [makeVideo({ id: vid('v1'), duration: 4000 })];

        const { result } = renderHook(() => useProfileStats({
            isOwnProfile: true,
            watchHistory: [vid('v1')],
            videoProgress: { [vid('v1')]: 100 },
            videos,
            likedVideos: new Set(),
            watchedTagFrequency: new Map(),
        }));

        expect(result.current?.watchTimeStr).toBe('1h 6m');
    });

    it('limits topTags to the 3 most frequent', () => {
        const { result } = renderHook(() => useProfileStats({
            isOwnProfile: true,
            watchHistory: [],
            videoProgress: {},
            videos: [],
            likedVideos: new Set(),
            watchedTagFrequency: new Map([
                [tag('a'), 1], [tag('b'), 4], [tag('c'), 3], [tag('d'), 2],
            ]),
        }));

        expect(result.current?.topTags).toEqual([tag('b'), tag('c'), tag('d')]);
    });
});
