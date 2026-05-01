import type { VideoId } from './video';

export type PlaylistId = string & { readonly _brand: 'PlaylistId' };

export const PlaylistName = {
    WATCH_LATER: 'Watch Later',
} as const;
export type PlaylistName = typeof PlaylistName[keyof typeof PlaylistName];

export interface Playlist {
    id: PlaylistId
    name: string
    videoIds: VideoId[]
    createdAt: string
}
