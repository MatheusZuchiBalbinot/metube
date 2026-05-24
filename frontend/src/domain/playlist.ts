import type { Playlist } from '@models/playlist';
import type { VideoId } from '@models/video';
import { PLAYLIST_CONSTANTS } from '@models/playlist';

function isWatchLater(p: Playlist): boolean {
    return p.name === PLAYLIST_CONSTANTS.WATCH_LATER;
}

function containsVideo(p: Playlist, videoId: VideoId): boolean {
    return p.videoIds.includes(videoId);
}

export const playlist = { isWatchLater, containsVideo };
