// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import { selectToasts } from '@store/toastSelectors';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

describe('toastSelectors', () => {
    it('selectToasts starts empty', () => {
        const store = makeStore();
        expect(selectToasts(store.getState())).toEqual([]);
    });

    it('selectToasts reflects added toasts', () => {
        const store = makeStore();
        store.dispatch(toastActions.addToast({ message: 'Saved', type: ToastType.SUCCESS }));

        const toasts = selectToasts(store.getState());
        expect(toasts).toHaveLength(1);
        expect(toasts[0].message).toBe('Saved');
    });
});
