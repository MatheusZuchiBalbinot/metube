// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import toastSlice, { toastActions } from '@store/toastSlice';
import type { Toast } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';


const reducer = toastSlice.reducer;

function makeToastPayload(overrides: Partial<Omit<Toast, 'id'>> = {}): Omit<Toast, 'id'> {
    return {
        message: 'Test message',
        type: ToastType.INFO,
        ...overrides,
    };
}

function makeState(toasts: Toast[] = []) {
    return { toasts };
}

function makeToast(overrides: Partial<Toast> = {}): Toast {
    return {
        id: 'toast-1',
        message: 'Test message',
        type: ToastType.INFO,
        ...overrides,
    };
}

beforeEach(() => {
    vi.stubGlobal('crypto', {
        randomUUID: vi.fn(() => `uuid-${Math.random().toString(36).slice(2)}`),
    });
});

describe('toastSlice — initial state', () => {
    it('has an empty toasts array', () => {
        const state = reducer(undefined, { type: '@@INIT' });
        expect(state.toasts).toEqual([]);
    });
});

describe('toastSlice — addToast', () => {
    it('adds a toast with a generated id', () => {
        const state = makeState([]);
        const next = reducer(state, toastActions.addToast(makeToastPayload()));
        expect(next.toasts).toHaveLength(1);
        expect(next.toasts[0].id).toBeTruthy();
    });

    it('preserves the message on the added toast', () => {
        const state = makeState([]);
        const next = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Hello world' })));
        expect(next.toasts[0].message).toBe('Hello world');
    });

    it('preserves the type on the added toast', () => {
        const state = makeState([]);
        const next = reducer(state, toastActions.addToast(makeToastPayload({ type: ToastType.SUCCESS })));
        expect(next.toasts[0].type).toBe(ToastType.SUCCESS);
    });

    it('preserves optional duration when provided', () => {
        const state = makeState([]);
        const next = reducer(state, toastActions.addToast(makeToastPayload({ duration: 5000 })));
        expect(next.toasts[0].duration).toBe(5000);
    });

    it('preserves optional action when provided', () => {
        const action = { label: 'Undo', onClick: vi.fn() };
        const state = makeState([]);
        const next = reducer(state, toastActions.addToast(makeToastPayload({ action })));
        expect(next.toasts[0].action?.label).toBe('Undo');
    });

    it('appends toasts in order', () => {
        const state = makeState([]);
        const after1 = reducer(state, toastActions.addToast(makeToastPayload({ message: 'First' })));
        const after2 = reducer(after1, toastActions.addToast(makeToastPayload({ message: 'Second' })));
        expect(after2.toasts[0].message).toBe('First');
        expect(after2.toasts[1].message).toBe('Second');
    });

    it('caps the list at 3 toasts', () => {
        let state = makeState([]);
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'First' })));
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Second' })));
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Third' })));
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Fourth' })));
        expect(state.toasts).toHaveLength(3);
    });

    it('evicts the oldest toast when the limit is exceeded', () => {
        let state = makeState([]);
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Oldest' })));
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Middle' })));
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Recent' })));
        state = reducer(state, toastActions.addToast(makeToastPayload({ message: 'Newest' })));
        const messages = state.toasts.map(t => t.message);
        expect(messages).not.toContain('Oldest');
        expect(messages).toContain('Newest');
    });

    it('supports all toast types', () => {
        const types = [ToastType.SUCCESS, ToastType.ERROR, ToastType.INFO];
        let state = makeState([]);

        for (const type of types) {
            state = reducer(state, toastActions.addToast(makeToastPayload({ type })));
        }

        const addedTypes = state.toasts.map(t => t.type);

        for (const type of types) {
            expect(addedTypes).toContain(type);
        }
    });
});

describe('toastSlice — removeToast', () => {
    it('removes the toast with the matching id', () => {
        const toasts = [
            makeToast({ id: 't1', message: 'First' }),
            makeToast({ id: 't2', message: 'Second' }),
        ];
        const state = makeState(toasts);
        const next = reducer(state, toastActions.removeToast('t1'));
        expect(next.toasts.find(t => t.id === 't1')).toBeUndefined();
        expect(next.toasts.find(t => t.id === 't2')).toBeDefined();
    });

    it('leaves the list unchanged when id does not match', () => {
        const toasts = [makeToast({ id: 't1' })];
        const state = makeState(toasts);
        const next = reducer(state, toastActions.removeToast('nonexistent'));
        expect(next.toasts).toHaveLength(1);
    });

    it('results in an empty array after removing the only toast', () => {
        const state = makeState([makeToast({ id: 't1' })]);
        const next = reducer(state, toastActions.removeToast('t1'));
        expect(next.toasts).toEqual([]);
    });

    it('preserves order of remaining toasts', () => {
        const toasts = [
            makeToast({ id: 't1', message: 'First' }),
            makeToast({ id: 't2', message: 'Second' }),
            makeToast({ id: 't3', message: 'Third' }),
        ];
        const state = makeState(toasts);
        const next = reducer(state, toastActions.removeToast('t2'));
        expect(next.toasts.map(t => t.id)).toEqual(['t1', 't3']);
    });
});
