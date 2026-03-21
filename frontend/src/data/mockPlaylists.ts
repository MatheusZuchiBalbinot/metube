export interface Playlist {
    id: string
    name: string
    videoIds: string[]
    createdAt: string
}

export const MOCK_PLAYLISTS: Playlist[] = [
    {
        id: 'pl_1',
        name: 'Frontend Essentials',
        videoIds: ['v001', 'v002', 'v003', 'v004', 'v005'],
        createdAt: '2026-01-10T10:00:00Z',
    },
    {
        id: 'pl_2',
        name: 'Design & CSS',
        videoIds: ['v008', 'v009', 'v013', 'v014', 'v012'],
        createdAt: '2026-01-15T14:00:00Z',
    },
    {
        id: 'pl_3',
        name: 'Algorithms & APIs',
        videoIds: ['v015', 'v016', 'v017', 'v020'],
        createdAt: '2026-02-01T09:00:00Z',
    },
];
