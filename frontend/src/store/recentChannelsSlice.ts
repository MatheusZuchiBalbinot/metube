import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS, loadFromStorage, isArray } from '@utils';

export interface RecentChannel {
    uuid: string
    name: string
}

const MAX_RECENT_CHANNELS = 8;

interface RecentChannelsState {
    channels: RecentChannel[]
}

const recentChannelsSlice = createSlice({
    name: 'recentChannels',
    initialState: (): RecentChannelsState => ({
        channels: loadFromStorage<RecentChannel[]>(STORAGE_KEYS.RECENT_CHANNELS, [], isArray),
    }),
    reducers: {
        recordChannelVisit(state, action: PayloadAction<RecentChannel>) {
            const { uuid, name } = action.payload;
            const isInvalid = uuid === '' || name === '';
            if (isInvalid) {
                return;
            }

            const withoutCurrent = state.channels.filter(c => c.uuid !== uuid);
            state.channels = [{ uuid, name }, ...withoutCurrent].slice(0, MAX_RECENT_CHANNELS);
        },
    },
});

export const recentChannelsActions = recentChannelsSlice.actions;
export default recentChannelsSlice;
