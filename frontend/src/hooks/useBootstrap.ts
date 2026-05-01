import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { playlistActions } from '@store/playlistSlice';
import { useAuth } from '@hooks/useAuth';
import { video } from '@api/videos';
import { interactions } from '@api/interactions';
import { playlist } from '@api/playlists';
import { history } from '@api/history';
import { VideoStatus } from '@models/video';

export function useBootstrap(): void {
    const dispatch = useAppDispatch();
    const { user } = useAuth();
    const localProgress = useAppSelector(s => s.video.videoProgress);

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

        playlist.list().then(result => {
            if (result) {
                dispatch(playlistActions.setPlaylists(result));
            }
        });

        history.progress().then(backendProgress => {
            if (!backendProgress) {
                return;
            }
            // Backend is the fallback: local wins if it has a higher (more recent) value
            const merged: Record<string, number> = { ...backendProgress };

            for (const [vuid, localPct] of Object.entries(localProgress)) {
                const backendPct = backendProgress[vuid] ?? 0;
                const isLocalAhead = localPct > backendPct;
                if (isLocalAhead) {
                    merged[vuid] = localPct;
                }
            }

            dispatch(videoActions.setVideoProgress(merged));
        });
    // Re-fetch whenever the authenticated user changes (logout → login)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);
}
