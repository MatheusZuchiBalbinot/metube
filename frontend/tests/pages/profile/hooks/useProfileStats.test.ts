// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProfileStats } from '@pages/profile/hooks/useProfileStats';
import { makeVideo, vid, tag } from '../../../helpers/factories';
import { VideoStatus } from '@models/video';

describe('useProfileStats', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null when not the own profile', () => {
        const { result } = renderHook(() => useProfileStats({
            isOwnProfile: false,
            videos: [makeVideo({ id: vid('v1') })],
        }));

        expect(result.current).toBeNull();
    });

    it('sums views across published videos only', () => {
        const videos = [
            makeVideo({ id: vid('v1'), views: 1000, status: VideoStatus.PUBLISHED }),
            makeVideo({ id: vid('v2'), views: 500, status: VideoStatus.PUBLISHED }),
            makeVideo({ id: vid('v3'), views: 999999, status: VideoStatus.DRAFT }),
            makeVideo({ id: vid('v4'), views: 999999, status: VideoStatus.FAILED }),
        ];

        const { result } = renderHook(() => useProfileStats({ isOwnProfile: true, videos }));

        expect(result.current?.totalViews).toBe(1500);
    });

    it('reads the subscriber count from any video carrying it', () => {
        const videos = [
            makeVideo({ id: vid('v1'), channelSubscribers: undefined }),
            makeVideo({ id: vid('v2'), channelSubscribers: 42 }),
        ];

        const { result } = renderHook(() => useProfileStats({ isOwnProfile: true, videos }));

        expect(result.current?.subscriberCount).toBe(42);
    });

    it('defaults subscriberCount to 0 when no video carries it', () => {
        const { result } = renderHook(() => useProfileStats({
            isOwnProfile: true,
            videos: [makeVideo({ id: vid('v1'), channelSubscribers: undefined })],
        }));

        expect(result.current?.subscriberCount).toBe(0);
    });

    it('counts uploads created in the current month regardless of status', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-08-15T12:00:00Z'));

        const videos = [
            makeVideo({ id: vid('v1'), createdAt: '2026-08-10T12:00:00Z', status: VideoStatus.PUBLISHED }),
            makeVideo({ id: vid('v2'), createdAt: '2026-08-20T12:00:00Z', status: VideoStatus.DRAFT }),
            makeVideo({ id: vid('v3'), createdAt: '2026-07-15T12:00:00Z', status: VideoStatus.PUBLISHED }),
        ];

        const { result } = renderHook(() => useProfileStats({ isOwnProfile: true, videos }));

        expect(result.current?.uploadsThisMonth).toBe(2);
    });

    it('computes topTags from published videos, limited to the 3 most frequent', () => {
        const videos = [
            makeVideo({ id: vid('v1'), status: VideoStatus.PUBLISHED, tags: [tag('a'), tag('b')] }),
            makeVideo({ id: vid('v2'), status: VideoStatus.PUBLISHED, tags: [tag('b'), tag('c')] }),
            makeVideo({ id: vid('v3'), status: VideoStatus.PUBLISHED, tags: [tag('b'), tag('d')] }),
            makeVideo({ id: vid('v4'), status: VideoStatus.DRAFT, tags: [tag('a'), tag('a')] }),
        ];

        const { result } = renderHook(() => useProfileStats({ isOwnProfile: true, videos }));

        expect(result.current?.topTags).toEqual([tag('b'), tag('a'), tag('c')]);
    });
});
