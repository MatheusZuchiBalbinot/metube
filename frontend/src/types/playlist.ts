import type { VideoId } from './video';

export type PlaylistId = string & { readonly _brand: 'PlaylistId' };

export interface Playlist {
    id: PlaylistId
    name: string
    videoIds: VideoId[]
    createdAt: string
}

export const PLAYLIST_CONSTANTS = {
    WATCH_LATER: 'Watch Later',
} as const;
export type PlaylistConstant = typeof PLAYLIST_CONSTANTS[keyof typeof PLAYLIST_CONSTANTS];
