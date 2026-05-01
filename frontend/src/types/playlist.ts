import type { VideoId } from './video';

export type PlaylistId = string & { readonly _brand: 'PlaylistId' };

export interface Playlist {
    id: PlaylistId
    name: string
    videoIds: VideoId[]
    createdAt: string
}

export const Playlist = {
    WATCH_LATER: 'Watch Later',
} as const;
export type PlaylistConst = typeof Playlist[keyof typeof Playlist];
