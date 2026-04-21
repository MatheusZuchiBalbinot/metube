import { useState } from 'react';
import { video } from '@api/videos';
import type { VideoUploadPayload } from '@api/videos';
import type { Video } from '@models/video';
import type { UploadProgress } from '@utils/upload';

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export function useUpload() {
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [status, setStatus] = useState<UploadStatus>('idle');

    async function upload(payload: VideoUploadPayload): Promise<Video | null> {
        setStatus('uploading');
        setProgress(null);

        const result = await video.create(payload, setProgress);

        if (result) {
            setStatus('done');
        } else {
            setStatus('error');
        }

        return result;
    }

    function reset() {
        setProgress(null);
        setStatus('idle');
    }

    return { progress, status, upload, reset };
}
