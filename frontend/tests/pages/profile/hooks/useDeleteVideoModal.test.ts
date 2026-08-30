// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeleteVideoModal } from '@pages/profile/hooks/useDeleteVideoModal';
import { makeVideo, vid } from '../../../helpers/factories';

describe('useDeleteVideoModal', () => {
    it('starts with no video pending deletion', () => {
        const { result } = renderHook(() => useDeleteVideoModal());

        expect(result.current.videoToDelete).toBeNull();
    });

    it('handleDeleteClick sets the pending video', () => {
        const { result } = renderHook(() => useDeleteVideoModal());
        const video = makeVideo({ id: vid('v1') });

        act(() => {
            result.current.handleDeleteClick(video);
        });

        expect(result.current.videoToDelete).toEqual(video);
    });

    it('handleDeleteById finds the video in the list and sets it as pending', () => {
        const { result } = renderHook(() => useDeleteVideoModal());
        const videos = [makeVideo({ id: vid('v1') }), makeVideo({ id: vid('v2') })];

        act(() => {
            result.current.handleDeleteById(vid('v2'), videos);
        });

        expect(result.current.videoToDelete?.id).toBe(vid('v2'));
    });

    it('handleDeleteById does nothing when the id is not found', () => {
        const { result } = renderHook(() => useDeleteVideoModal());
        const videos = [makeVideo({ id: vid('v1') })];

        act(() => {
            result.current.handleDeleteById(vid('missing'), videos);
        });

        expect(result.current.videoToDelete).toBeNull();
    });

    it('handleDeleteConfirm calls onDelete with the pending id and clears it', () => {
        const { result } = renderHook(() => useDeleteVideoModal());
        const video = makeVideo({ id: vid('v1') });
        const onDelete = vi.fn();

        act(() => {
            result.current.handleDeleteClick(video);
        });
        act(() => {
            result.current.handleDeleteConfirm(onDelete);
        });

        expect(onDelete).toHaveBeenCalledWith(vid('v1'));
        expect(result.current.videoToDelete).toBeNull();
    });

    it('handleDeleteConfirm is a no-op when there is no pending video', () => {
        const { result } = renderHook(() => useDeleteVideoModal());
        const onDelete = vi.fn();

        act(() => {
            result.current.handleDeleteConfirm(onDelete);
        });

        expect(onDelete).not.toHaveBeenCalled();
    });

    it('handleDeleteCancel clears the pending video', () => {
        const { result } = renderHook(() => useDeleteVideoModal());
        const video = makeVideo({ id: vid('v1') });

        act(() => {
            result.current.handleDeleteClick(video);
        });
        act(() => {
            result.current.handleDeleteCancel();
        });

        expect(result.current.videoToDelete).toBeNull();
    });
});
