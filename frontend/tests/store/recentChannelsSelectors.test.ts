// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '@store/reducers';
import { recentChannelsActions } from '@store/recentChannelsSlice';
import { selectRecentChannels } from '@store/recentChannelsSelectors';

function makeStore() {
    return configureStore({ reducer: rootReducer });
}

describe('recentChannelsSelectors', () => {
    it('selectRecentChannels starts empty', () => {
        const store = makeStore();
        expect(selectRecentChannels(store.getState())).toEqual([]);
    });

    it('selectRecentChannels reflects a recorded visit', () => {
        const store = makeStore();
        store.dispatch(recentChannelsActions.recordChannelVisit({ uuid: 'c1', name: 'Alpha' }));

        expect(selectRecentChannels(store.getState())).toEqual([{ uuid: 'c1', name: 'Alpha' }]);
    });
});
