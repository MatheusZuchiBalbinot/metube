// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTranscriptionStatusBroadcast } from '@hooks/useTranscriptionStatusBroadcast';

describe('useTranscriptionStatusBroadcast', () => {
    it('notifies with the toast matching the status', () => {
        const notify = vi.fn();
        const findVideoByVuid = vi.fn().mockReturnValue({ id: 'v-1', title: 'T', thumbnail: 'thumb.jpg' });
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(() => useTranscriptionStatusBroadcast({ notify, tRef, findVideoByVuid }));

        result.current({ vuid: 'v-1', status: 'completed', emitted_at_ms: 1000 });

        expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'video.transcription_completed_toast' }));
    });

    it('ignores an unknown status', () => {
        const notify = vi.fn();
        const findVideoByVuid = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(() => useTranscriptionStatusBroadcast({ notify, tRef, findVideoByVuid }));

        result.current({ vuid: 'v-1', status: 'unknown', emitted_at_ms: 1000 });

        expect(notify).not.toHaveBeenCalled();
    });

    it('drops a broadcast delivered out of order', () => {
        const notify = vi.fn();
        const findVideoByVuid = vi.fn();
        const tRef = { current: (key: string) => key };

        const { result } = renderHook(() => useTranscriptionStatusBroadcast({ notify, tRef, findVideoByVuid }));

        result.current({ vuid: 'v-1', status: 'completed', emitted_at_ms: 2000 });
        result.current({ vuid: 'v-1', status: 'failed', emitted_at_ms: 1000 });

        expect(notify).toHaveBeenCalledTimes(1);
        expect(notify).toHaveBeenCalledWith(expect.objectContaining({ message: 'video.transcription_completed_toast' }));
    });
});
