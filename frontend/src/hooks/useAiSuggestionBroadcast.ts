import { useCallback } from 'react';
import { ToastType } from '@enums/toastType';
import type { Video } from '@models';
import type { Toast } from '@store/toastSlice';

export interface AiSuggestionEvent {
    vuid: string
    title: string
}

interface Params {
    notify: (toast: Omit<Toast, 'id'>) => void
    tRef: React.RefObject<(key: string, vars?: Record<string, unknown>) => string>
    findVideoByVuid: (vuid: string) => Video | undefined
}

export function useAiSuggestionBroadcast({ notify, tRef, findVideoByVuid }: Params): (payload: AiSuggestionEvent) => void {
    return useCallback((payload: AiSuggestionEvent) => {
        const video = findVideoByVuid(payload.vuid);

        notify({
            message: tRef.current('ai_suggestion.pending_toast', { title: payload.title }),
            type: ToastType.SUCCESS,
            thumbnail: video?.thumbnail,
            subtitle: video?.title,
        });
    }, [notify, tRef, findVideoByVuid]);
}
