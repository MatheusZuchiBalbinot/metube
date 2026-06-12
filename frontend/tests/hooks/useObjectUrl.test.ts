// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useObjectUrl } from '@hooks/useObjectUrl';

let counter = 0;
const createObjectURL = vi.fn(() => `blob:mock/${counter++}`);
const revokeObjectURL = vi.fn();

beforeEach(() => {
    counter = 0;
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
    globalThis.URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    globalThis.URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
});

function makeFile() {
    return new File(['x'], 'f.mp4', { type: 'video/mp4' });
}

describe('useObjectUrl', () => {
    it('starts with a null url', () => {
        const { result } = renderHook(() => useObjectUrl());
        expect(result.current.url).toBeNull();
    });

    it('set creates and exposes an object url', () => {
        const { result } = renderHook(() => useObjectUrl());

        let returned = '';
        act(() => {
            returned = result.current.set(makeFile());
        });

        expect(returned).toBe('blob:mock/0');
        expect(result.current.url).toBe('blob:mock/0');
        expect(createObjectURL).toHaveBeenCalledTimes(1);
    });

    it('revokes the previous url when set is called again', () => {
        const { result } = renderHook(() => useObjectUrl());

        act(() => {
            result.current.set(makeFile());
        });
        act(() => {
            result.current.set(makeFile());
        });

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/0');
        expect(result.current.url).toBe('blob:mock/1');
    });

    it('clear revokes the current url and resets to null', () => {
        const { result } = renderHook(() => useObjectUrl());

        act(() => {
            result.current.set(makeFile());
        });
        act(() => {
            result.current.clear();
        });

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/0');
        expect(result.current.url).toBeNull();
    });

    it('revokes the outstanding url on unmount', () => {
        const { result, unmount } = renderHook(() => useObjectUrl());

        act(() => {
            result.current.set(makeFile());
        });
        unmount();

        expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock/0');
    });
});
