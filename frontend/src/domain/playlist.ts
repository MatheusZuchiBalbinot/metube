import { PLAYLIST_CONSTANTS, type Playlist, type VideoId } from '@models';

function isWatchLater(p: Playlist): boolean {
    return p.name === PLAYLIST_CONSTANTS.WATCH_LATER;
}

function containsVideo(p: Playlist, videoId: VideoId): boolean {
    return p.videoIds.includes(videoId);
}

export const playlist = { isWatchLater, containsVideo };
