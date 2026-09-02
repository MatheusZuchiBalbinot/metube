import { useCallback, useRef } from 'react';
import { useAppDispatch } from '@store/index';
import { videoActions } from '@store/videoSlice';
import { video as videoApi } from '@api';
import type { Vuid } from '@api';
import { ToastType } from '@enums/toastType';
import { VideoStatus } from '@models';
import type { Video } from '@models';
import type { Toast } from '@store/toastSlice';
import { isStaleBroadcast } from '@utils/broadcastStaleness';

export interface VideoStatusEvent {
    vuid: string
    status: string
    emitted_at_ms?: number
}

interface Params {
    notify: (toast: Omit<Toast, 'id'>) => void
    tRef: React.RefObject<(key: string) => string>
    findVideoByVuid: (vuid: string) => Video | undefined
}

// Applies a `.VideoStatusUpdated` broadcast, dropping a stale out-of-order one.
export function useVideoStatusBroadcast({ notify, tRef, findVideoByVuid }: Params): (data: VideoStatusEvent) => void {
    const dispatch = useAppDispatch();
    const lastEventMs = useRef<Map<string, number>>(new Map());

    return useCallback((data: VideoStatusEvent) => {
        if (isStaleBroadcast(lastEventMs.current, data.vuid, data.emitted_at_ms)) {
            return;
        }

        dispatch(videoActions.updateVideoStatus({ vuid: data.vuid as Vuid, status: data.status as VideoStatus }));

        const isTerminalStatus = data.status !== VideoStatus.PROCESSING;

        if (isTerminalStatus) {
            videoApi.get(data.vuid as Vuid).then(result => {
                if (result.ok) {
                    dispatch(videoActions.updateVideo(result.data));
                }
            });
        }

        const isProcessing = data.status === VideoStatus.PROCESSING;

        if (!isProcessing) {
            return;
        }

        const video = findVideoByVuid(data.vuid);

        notify({
            message: tRef.current('video.processing_toast'),
            type: ToastType.INFO,
            thumbnail: video?.thumbnail,
            subtitle: video?.title,
        });
    }, [dispatch, notify, tRef, findVideoByVuid]);
}
