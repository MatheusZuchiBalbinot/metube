import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Tag, VideoId } from '@models';

export interface TagView {
    tag: Tag
    fromVideoId: VideoId | null
}

export interface MiniPlayerState {
    videoId: VideoId
    currentTime: number
    seekSession: number
}

/**
 * Ephemeral, view-only state for the video experience: the upload modal, the
 * active tag overlay, the mini player and a pending seek hand-off.
 *
 * Kept separate from `videoSlice` (which owns video *data*) for SRP — none of
 * these fields is persisted or synced across tabs.
 */
export interface VideoUiState {
    uploadModalOpen: boolean
    activeTagView: TagView | null
    miniPlayer: MiniPlayerState | null
    pendingVideoSeek: { videoId: VideoId; time: number } | null
}

const initialState: VideoUiState = {
    uploadModalOpen: false,
    activeTagView: null,
    miniPlayer: null,
    pendingVideoSeek: null,
};

const videoUiSlice = createSlice({
    name: 'videoUi',
    initialState,
    reducers: {
        openUploadModal(state) {
            state.uploadModalOpen = true;
        },

        closeUploadModal(state) {
            state.uploadModalOpen = false;
        },

        openTagView(state, action: PayloadAction<TagView>) {
            state.activeTagView = action.payload;
        },

        closeTagView(state) {
            state.activeTagView = null;
        },

        openMiniPlayer(state, action: PayloadAction<Omit<MiniPlayerState, 'seekSession'>>) {
            const prevSession = state.miniPlayer?.seekSession ?? 0;
            state.miniPlayer = { ...action.payload, seekSession: prevSession + 1 };
        },

        closeMiniPlayer(state) {
            state.miniPlayer = null;
        },

        setPendingVideoSeek(state, action: PayloadAction<{ videoId: VideoId; time: number }>) {
            state.pendingVideoSeek = action.payload;
        },

        clearPendingVideoSeek(state) {
            state.pendingVideoSeek = null;
        },
    },
});

export const videoUiActions = videoUiSlice.actions;
export default videoUiSlice;
