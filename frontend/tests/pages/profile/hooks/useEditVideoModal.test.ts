// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditVideoModal } from '@pages/profile/hooks/useEditVideoModal';
import { makeVideo, vid, tag } from '../../../helpers/factories';

function makeFormEvent() {
    return { preventDefault: vi.fn() } as unknown as React.FormEvent;
}

describe('useEditVideoModal', () => {
    it('starts with no video being edited', () => {
        const { result } = renderHook(() => useEditVideoModal());

        expect(result.current.editingVideo).toBeNull();
    });

    it('handleEditOpen seeds all fields from the video', () => {
        const { result } = renderHook(() => useEditVideoModal());
        const video = makeVideo({
            id: vid('v1'),
            title: 'Title',
            description: 'Desc',
            tags: [tag('a'), tag('b')],
        });

        act(() => {
            result.current.handleEditOpen(video);
        });

        expect(result.current.editingVideo).toEqual(video);
        expect(result.current.editTitle).toBe('Title');
        expect(result.current.editDescription).toBe('Desc');
        expect(result.current.editTags).toEqual([tag('a'), tag('b')]);
    });

    it('handleEditClose clears the editing video', () => {
        const { result } = renderHook(() => useEditVideoModal());

        act(() => {
            result.current.handleEditOpen(makeVideo({ id: vid('v1') }));
        });
        act(() => {
            result.current.handleEditClose();
        });

        expect(result.current.editingVideo).toBeNull();
    });

    it('handleEditSubmit trims the fields and calls onSave with the video id', () => {
        const { result } = renderHook(() => useEditVideoModal());
        const onSave = vi.fn();

        act(() => {
            result.current.handleEditOpen(makeVideo({ id: vid('v1') }));
        });
        act(() => {
            result.current.setEditTitle('  New title  ');
            result.current.setEditDescription('  New desc  ');
        });
        act(() => {
            result.current.handleEditSubmit(makeFormEvent(), onSave);
        });

        expect(onSave).toHaveBeenCalledWith(vid('v1'), {
            title: 'New title',
            description: 'New desc',
            tags: expect.any(Array),
        });
        expect(result.current.editingVideo).toBeNull();
    });

    it('handleEditSubmit does not save when the title is blank', () => {
        const { result } = renderHook(() => useEditVideoModal());
        const onSave = vi.fn();

        act(() => {
            result.current.handleEditOpen(makeVideo({ id: vid('v1') }));
        });
        act(() => {
            result.current.setEditTitle('   ');
        });
        act(() => {
            result.current.handleEditSubmit(makeFormEvent(), onSave);
        });

        expect(onSave).not.toHaveBeenCalled();
    });

    it('handleEditSubmit does not save when there is no editing video', () => {
        const { result } = renderHook(() => useEditVideoModal());
        const onSave = vi.fn();

        act(() => {
            result.current.handleEditSubmit(makeFormEvent(), onSave);
        });

        expect(onSave).not.toHaveBeenCalled();
    });
});
