import { useCallback } from 'react';
import { analytics, toVuid, type AnalyticsSource } from '@api';
import { getSessionId } from '@utils';
import type { VideoId } from '@models';

/**
 * Returns a `trackClick` callback that reports an analytics click for `videoId`
 * from `source`. No-ops when the video has no valid vuid; failures are swallowed
 * since click tracking must never block navigation.
 */
export function useVideoClickTracking(videoId: VideoId, source: AnalyticsSource) {
    return useCallback((position?: number) => {
        const vuid = toVuid(videoId);
        const hasValidVuid = vuid !== undefined && vuid !== '';

        if (!hasValidVuid) {
            return;
        }

        analytics.click({
            vuid,
            source,
            position,
            sessionId: getSessionId(),
        }).catch(() => {});
    }, [videoId, source]);
}
