import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { playlistActions } from '@store/playlistSlice';
import { video, interactions, playlist, history } from '@api';
import { VideoStatus } from '@models';
import { mergeProgress } from '@utils';
import { useAuth } from '@hooks';

export function useBootstrap(): void {
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const localProgress = useAppSelector(s => s.video.videoProgress);

    useEffect(() => {
        if (!user) {
            return;
        }

        video.list({ status: VideoStatus.PUBLISHED }).then(result => {
            if (result.ok) {
                dispatch(videoActions.setVideos(result.data.data));
            }
        });

        interactions.liked().then(result => {
            if (result.ok) {
                dispatch(videoActions.setLikedVideos(result.data.data.map(v => v.id)));
            }
        });

        playlist.list().then(result => {
            if (result.ok) {
                dispatch(playlistActions.setPlaylists(result.data));
            }
        });

        history.progress().then(backendProgress => {
            if (!backendProgress) {
                return;
            }
            dispatch(videoActions.setVideoProgress(mergeProgress(localProgress, backendProgress)));
        });
    // Re-fetch whenever the authenticated user changes (logout → login)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);
}
