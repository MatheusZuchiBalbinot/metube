import { useCallback } from 'react';
import type { Location } from 'react-router-dom';
import { useAppDispatch } from '@store/index';
import { notificationsActions } from '@store/notificationsSlice';
import { videoActions } from '@store/videoSlice';
import { video as videoApi } from '@api';
import type { Vuid } from '@api';
import { NotificationType } from '@enums/notificationType';
import { ToastType } from '@enums/toastType';
import type { Toast } from '@store/toastSlice';
import { BROADCAST_HANDLED_TYPES, formatNotificationMessage, normalizeBroadcastNotification } from '@utils/notificationBroadcast';

interface Params {
    notify: (toast: Omit<Toast, 'id'>) => void
    tRef: React.RefObject<(key: string, vars?: Record<string, unknown>) => string>
    locationRef: React.RefObject<Location>
}

// Applies a private-channel Laravel notification: persists, refreshes, and toasts it.
export function useNotificationBroadcast({ notify, tRef, locationRef }: Params): (payload: Record<string, unknown>) => void {
    const dispatch = useAppDispatch();

    return useCallback((payload: Record<string, unknown>) => {
        const notification = normalizeBroadcastNotification(payload);

        if (notification === null) {
            return;
        }

        dispatch(notificationsActions.addNotification(notification));

        const isAiSummaryReady = notification.type === NotificationType.VIDEO_AI_SUMMARY_READY;

        if (isAiSummaryReady) {
            const vuid = notification.data.vuid as string | undefined;
            const currentVuid = new URLSearchParams(locationRef.current.search).get('v');
            const isCurrentlyWatching = vuid !== undefined && vuid === currentVuid;

            // VideoPage refreshes itself; skip it here to avoid a spurious re-render.
            if (vuid && !isCurrentlyWatching) {
                void videoApi.get(vuid as Vuid).then(result => {
                    if (result.ok) {
                        dispatch(videoActions.updateVideo(result.data));
                    }
                });
            }
        }

        const hasDedicatedBroadcastHandler = BROADCAST_HANDLED_TYPES.has(notification.type);

        if (hasDedicatedBroadcastHandler) {
            return;
        }

        const thumbnail = notification.data.thumbnail_url as string | undefined;
        const subtitle = notification.data.video_title as string | undefined;

        notify({
            message: formatNotificationMessage(notification, tRef.current),
            type: ToastType.INFO,
            thumbnail: thumbnail ?? undefined,
            subtitle,
        });
    }, [dispatch, notify, tRef, locationRef]);
}
