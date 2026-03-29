export type { Playlist, PlaylistId } from '@models/playlist';

import type { Playlist, PlaylistId } from '@models/playlist';
import type { VideoId } from '@models/video';

export const MOCK_PLAYLISTS: Playlist[] = [
    {
        id: 'pl_1' as PlaylistId,
        name: 'Frontend Essentials',
        videoIds: ['v001', 'v002', 'v003', 'v004', 'v005'] as VideoId[],
        createdAt: '2026-01-10T10:00:00Z',
    },
    {
        id: 'pl_2' as PlaylistId,
        name: 'Design & CSS',
        videoIds: ['v008', 'v009', 'v013', 'v014', 'v012'] as VideoId[],
        createdAt: '2026-01-15T14:00:00Z',
    },
    {
        id: 'pl_3' as PlaylistId,
        name: 'Algorithms & APIs',
        videoIds: ['v015', 'v016', 'v017', 'v020'] as VideoId[],
        createdAt: '2026-02-01T09:00:00Z',
    },
];
