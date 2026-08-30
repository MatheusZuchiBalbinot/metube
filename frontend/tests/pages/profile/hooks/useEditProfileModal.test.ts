// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditProfileModal } from '@pages/profile/hooks/useEditProfileModal';

function makeFormEvent() {
    return { preventDefault: vi.fn() } as unknown as React.FormEvent;
}

describe('useEditProfileModal', () => {
    it('starts closed with empty fields', () => {
        const { result } = renderHook(() => useEditProfileModal());

        expect(result.current.editProfileOpen).toBe(false);
        expect(result.current.editName).toBe('');
        expect(result.current.editBio).toBe('');
    });

    it('handleEditProfileOpen seeds the fields and opens the modal', () => {
        const { result } = renderHook(() => useEditProfileModal());

        act(() => {
            result.current.handleEditProfileOpen('Jane', 'Bio text');
        });

        expect(result.current.editProfileOpen).toBe(true);
        expect(result.current.editName).toBe('Jane');
        expect(result.current.editBio).toBe('Bio text');
    });

    it('handleEditProfileClose closes the modal', () => {
        const { result } = renderHook(() => useEditProfileModal());

        act(() => {
            result.current.handleEditProfileOpen('Jane', 'Bio');
        });
        act(() => {
            result.current.handleEditProfileClose();
        });

        expect(result.current.editProfileOpen).toBe(false);
    });

    it('handleEditProfileSubmit trims and saves, then closes', () => {
        const { result } = renderHook(() => useEditProfileModal());
        const onSave = vi.fn();

        act(() => {
            result.current.handleEditProfileOpen('  Jane  ', '  Bio  ');
        });
        act(() => {
            result.current.setEditName('  Jane  ');
            result.current.setEditBio('  Bio  ');
        });
        act(() => {
            result.current.handleEditProfileSubmit(makeFormEvent(), onSave);
        });

        expect(onSave).toHaveBeenCalledWith('Jane', 'Bio');
        expect(result.current.editProfileOpen).toBe(false);
    });

    it('handleEditProfileSubmit does not save when the name is blank', () => {
        const { result } = renderHook(() => useEditProfileModal());
        const onSave = vi.fn();

        act(() => {
            result.current.setEditName('   ');
        });
        act(() => {
            result.current.handleEditProfileSubmit(makeFormEvent(), onSave);
        });

        expect(onSave).not.toHaveBeenCalled();
    });
});
