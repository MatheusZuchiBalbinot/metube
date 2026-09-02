import { useCallback, useRef } from 'react';
import { ToastType } from '@enums/toastType';
import type { Video } from '@models';
import type { Toast } from '@store/toastSlice';
import { isStaleBroadcast } from '@utils/broadcastStaleness';

export interface TranscriptionStatusEvent {
    vuid: string
    status: string
    emitted_at_ms?: number
}

interface Params {
    notify: (toast: Omit<Toast, 'id'>) => void
    tRef: React.RefObject<(key: string) => string>
    findVideoByVuid: (vuid: string) => Video | undefined
}

const TRANSCRIPTION_TOAST: Record<string, { key: string; type: ToastType }> = {
    processing: { key: 'video.transcription_started_toast', type: ToastType.INFO },
    completed: { key: 'video.transcription_completed_toast', type: ToastType.SUCCESS },
    failed: { key: 'video.transcription_failed_toast', type: ToastType.ERROR },
};

// Applies a `.TranscriptionStatusUpdated` broadcast, dropping a stale out-of-order one.
export function useTranscriptionStatusBroadcast({ notify, tRef, findVideoByVuid }: Params): (data: TranscriptionStatusEvent) => void {
    const lastEventMs = useRef<Map<string, number>>(new Map());

    return useCallback((data: TranscriptionStatusEvent) => {
        if (isStaleBroadcast(lastEventMs.current, data.vuid, data.emitted_at_ms)) {
            return;
        }

        const toastConfig = TRANSCRIPTION_TOAST[data.status];

        if (toastConfig === undefined) {
            return;
        }

        const video = findVideoByVuid(data.vuid);

        notify({
            message: tRef.current(toastConfig.key),
            type: toastConfig.type,
            thumbnail: video?.thumbnail,
            subtitle: video?.title,
        });
    }, [notify, tRef, findVideoByVuid]);
}
