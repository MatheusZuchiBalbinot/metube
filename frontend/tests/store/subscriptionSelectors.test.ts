// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { subscriptionActions } from '@store/subscriptionSlice';
import { selectSubscribedChannelIds, selectSubscribedSet } from '@store/subscriptionSelectors';
import { chId } from '../helpers/factories';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

describe('subscriptionSelectors', () => {
    it('selectSubscribedChannelIds reflects the raw list', () => {
        const store = makeStore();
        store.dispatch(subscriptionActions.toggleSubscription(chId('ch-1')));

        expect(selectSubscribedChannelIds(store.getState())).toEqual([chId('ch-1')]);
    });

    it('selectSubscribedSet returns a Set for O(1) lookup', () => {
        const store = makeStore();
        store.dispatch(subscriptionActions.toggleSubscription(chId('ch-1')));

        const set = selectSubscribedSet(store.getState());
        expect(set.has(chId('ch-1'))).toBe(true);
        expect(set.has(chId('ch-2'))).toBe(false);
    });

    it('selectSubscribedSet is memoized while the underlying ids are unchanged', () => {
        const store = makeStore();
        store.dispatch(subscriptionActions.toggleSubscription(chId('ch-1')));

        expect(selectSubscribedSet(store.getState())).toBe(selectSubscribedSet(store.getState()));
    });
});
