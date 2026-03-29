import type { VideoId } from './video';

export type PlaylistId = string & { readonly _brand: 'PlaylistId' };

export interface Playlist {
    id: PlaylistId
    name: string
    videoIds: VideoId[]
    createdAt: string
}
