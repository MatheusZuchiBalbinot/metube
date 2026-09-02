import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store/index';
import { selectAuthUser } from '@store/authSelectors';
import { notificationsActions } from '@store/notificationsSlice';
import { toastActions } from '@store/toastSlice';
import { videoActions } from '@store/videoSlice';
import { selectAllVideos } from '@store/videoSelectors';
import { notifications as notificationsApi, video as videoApi } from '@api';
import type { Vuid } from '@api';
import { getEcho, destroyEcho } from '@lib/echo';
import { playNotificationSound } from '@utils';
import { bindRealtimeReconnect } from '@utils/realtimeReconnect';
import type { Video, VideoId } from '@models';
import type { Toast } from '@store/toastSlice';
import { useVideoStatusBroadcast } from './useVideoStatusBroadcast';
import { useTranscriptionStatusBroadcast } from './useTranscriptionStatusBroadcast';
import { useAiSuggestionBroadcast } from './useAiSuggestionBroadcast';
import { useNotificationBroadcast } from './useNotificationBroadcast';

export function useRealtime(): void {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectAuthUser);
    const location = useLocation();
    const locationRef = useRef(location);
    useLayoutEffect(() => {
        locationRef.current = location;
    });
    const videos = useAppSelector(selectAllVideos);
    const videosRef = useRef<Video[]>(videos);
    useLayoutEffect(() => {
        videosRef.current = videos;
    });
    // Ref so a language switch doesn't tear down and rebuild the Echo subscription.
    const tRef = useRef(t);
    useLayoutEffect(() => {
        tRef.current = t;
    });

    // Exact id match — a substring check could match the wrong video.
    const findVideoByVuid = useCallback((vuid: string): Video | undefined => {
        return videosRef.current.find(v => v.id === (vuid as unknown as VideoId));
    }, []);

    const notify = useCallback((toast: Omit<Toast, 'id'>) => {
        dispatch(toastActions.addToast(toast));
        void playNotificationSound();
    }, [dispatch]);

    const handleNotification = useNotificationBroadcast({ notify, tRef, locationRef });
    const handleVideoStatus = useVideoStatusBroadcast({ notify, tRef, findVideoByVuid });
    const handleTranscriptionStatus = useTranscriptionStatusBroadcast({ notify, tRef, findVideoByVuid });
    const handleAiSuggestion = useAiSuggestionBroadcast({ notify, tRef, findVideoByVuid });

    // Stable identity, not the user object reference, or an auth re-fetch would churn the WebSocket.
    const userUuid = user?.uuid ?? null;

    useEffect(() => {
        if (userUuid === null) {
            return;
        }

        const fetchInitialCount = async (): Promise<void> => {
            const count = await notificationsApi.unreadCount();
            dispatch(notificationsActions.setUnreadCount(count));
        };

        void fetchInitialCount();

        let isCancelled = false;
        let activeEcho: Awaited<ReturnType<typeof getEcho>> = null;

        function reconcileAfterReconnect(): void {
            void fetchInitialCount();

            const currentVuid = new URLSearchParams(locationRef.current.search).get('v');

            if (currentVuid === null) {
                return;
            }

            void videoApi.get(currentVuid as Vuid).then(result => {
                if (result.ok) {
                    dispatch(videoActions.updateVideo(result.data));
                }
            });
        }

        let unbindConnectionStateChange: (() => void) | null = null;

        void getEcho().then(echo => {
            if (isCancelled || echo === null) {
                return;
            }

            activeEcho = echo;

            const channel = echo.private(`users.${userUuid}`);

            channel.notification(handleNotification);
            channel.listen('.VideoStatusUpdated', handleVideoStatus);
            channel.listen('.TranscriptionStatusUpdated', handleTranscriptionStatus);
            channel.listen('.AiSuggestionReady', handleAiSuggestion);

            const connection = echo.connector?.pusher?.connection;

            if (connection !== undefined) {
                unbindConnectionStateChange = bindRealtimeReconnect(connection, reconcileAfterReconnect);
            }
        });

        return () => {
            isCancelled = true;
            unbindConnectionStateChange?.();
            // Only leave this channel — the logout effect below owns destroying the singleton.
            activeEcho?.leave(`users.${userUuid}`);
        };
    }, [dispatch, userUuid, handleNotification, handleVideoStatus, handleTranscriptionStatus, handleAiSuggestion]);

    useEffect(() => {
        if (userUuid === null) {
            return;
        }

        return () => {
            destroyEcho();
        };
    }, [userUuid]);
}
