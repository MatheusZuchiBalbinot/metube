// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportImpression, resetImpressionBatcher } from '@utils/impressionBatcher';
import { analytics, AnalyticsSource, type Vuid } from '@api';

describe('impressionBatcher', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        resetImpressionBatcher();
        vi.spyOn(analytics, 'impressions').mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('flushes a batch after the debounce window', () => {
        reportImpression('aaa' as unknown as Vuid, AnalyticsSource.HOME);
        reportImpression('bbb' as unknown as Vuid, AnalyticsSource.HOME);

        expect(analytics.impressions).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1000);

        expect(analytics.impressions).toHaveBeenCalledTimes(1);
        expect(analytics.impressions).toHaveBeenCalledWith(expect.objectContaining({
            vuids: ['aaa', 'bbb'],
            source: AnalyticsSource.HOME,
        }));
    });

    it('deduplicates the same vuid within a source', () => {
        reportImpression('aaa' as unknown as Vuid, AnalyticsSource.FEED);
        reportImpression('aaa' as unknown as Vuid, AnalyticsSource.FEED);
        reportImpression('aaa' as unknown as Vuid, AnalyticsSource.FEED);

        vi.advanceTimersByTime(1000);

        expect(analytics.impressions).toHaveBeenCalledWith(expect.objectContaining({
            vuids: ['aaa'],
            source: AnalyticsSource.FEED,
        }));
    });

    it('keeps separate batches per source', () => {
        reportImpression('a1' as unknown as Vuid, AnalyticsSource.HOME);
        reportImpression('a2' as unknown as Vuid, AnalyticsSource.SEARCH);

        vi.advanceTimersByTime(1000);

        expect(analytics.impressions).toHaveBeenCalledTimes(2);
    });
});
