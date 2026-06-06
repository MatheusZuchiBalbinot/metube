// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import recentChannelsSlice, { recentChannelsActions, type RecentChannel } from '@store/recentChannelsSlice';

const reducer = recentChannelsSlice.reducer;

function stateWith(channels: RecentChannel[]) {
    return { channels };
}

describe('recentChannelsSlice', () => {
    it('records a visited channel at the front', () => {
        const next = reducer(stateWith([]), recentChannelsActions.recordChannelVisit({ uuid: 'c1', name: 'Alpha' }));
        expect(next.channels).toEqual([{ uuid: 'c1', name: 'Alpha' }]);
    });

    it('moves an already-visited channel to the front without duplicating', () => {
        const initial = stateWith([{ uuid: 'c1', name: 'Alpha' }, { uuid: 'c2', name: 'Beta' }]);
        const next = reducer(initial, recentChannelsActions.recordChannelVisit({ uuid: 'c2', name: 'Beta' }));
        expect(next.channels).toEqual([{ uuid: 'c2', name: 'Beta' }, { uuid: 'c1', name: 'Alpha' }]);
    });

    it('caps the list at 8 entries', () => {
        const many = Array.from({ length: 8 }, (_, i) => ({ uuid: `c${i}`, name: `Ch ${i}` }));
        const next = reducer(stateWith(many), recentChannelsActions.recordChannelVisit({ uuid: 'new', name: 'New' }));
        expect(next.channels).toHaveLength(8);
        expect(next.channels[0]).toEqual({ uuid: 'new', name: 'New' });
        expect(next.channels.some(c => c.uuid === 'c7')).toBe(false);
    });

    it('ignores entries missing uuid or name', () => {
        const initial = stateWith([{ uuid: 'c1', name: 'Alpha' }]);
        const next = reducer(initial, recentChannelsActions.recordChannelVisit({ uuid: '', name: 'Nameless' }));
        expect(next.channels).toEqual([{ uuid: 'c1', name: 'Alpha' }]);
    });
});
