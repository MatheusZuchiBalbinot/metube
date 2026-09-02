// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAiSuggestionBroadcast } from '@hooks/useAiSuggestionBroadcast';

describe('useAiSuggestionBroadcast', () => {
    it('notifies with the suggestion title', () => {
        const notify = vi.fn();
        const findVideoByVuid = vi.fn().mockReturnValue({ id: 'v-1', title: 'T', thumbnail: 'thumb.jpg' });
        const tRef = { current: (key: string, vars?: Record<string, unknown>) => `${key}:${JSON.stringify(vars)}` };

        const { result } = renderHook(() => useAiSuggestionBroadcast({ notify, tRef, findVideoByVuid }));

        result.current({ vuid: 'v-1', title: 'New title' });

        expect(notify).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('New title'),
            thumbnail: 'thumb.jpg',
            subtitle: 'T',
        }));
    });
});
