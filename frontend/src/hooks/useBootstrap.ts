import { useEffect } from 'react';
import { useAppDispatch } from '@store';
import { videoActions } from '@store/videoSlice';
import { playlistActions } from '@store/playlistSlice';
import { useAuth } from '@hooks/useAuth';
import { video } from '@api/videos';
import { interactions } from '@api/interactions';
import { playlist } from '@api/playlists';
import { VideoStatus } from '@models/video';

export function useBootstrap(): void {
    const dispatch = useAppDispatch();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            return;
        }

        video.list({ status: VideoStatus.PUBLISHED }).then(result => {
            if (result) {
                dispatch(videoActions.setVideos(result.data));
            }
        });

        interactions.liked().then(result => {
            if (result) {
                dispatch(videoActions.setLikedVideos(result.data.map(v => v.id)));
            }
        });

        interactions.saved().then(result => {
            if (result) {
                dispatch(videoActions.setSavedVideos(result.data.map(v => v.id)));
            }
        });

        playlist.list().then(result => {
            if (result) {
                dispatch(playlistActions.setPlaylists(result));
            }
        });
    // Re-fetch whenever the authenticated user changes (logout → login)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);
}
