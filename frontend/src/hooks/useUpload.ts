import { useState } from 'react';
import { video } from '@api';
import type { VideoUploadPayload } from '@api';
import type { Video } from '@models';
import type { UploadProgress } from '@utils';
import { UploadStatus } from '@enums/uploadStatus';

export type { UploadStatus } from '@enums/uploadStatus';

export function useUpload() {
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [status, setStatus] = useState<UploadStatus>(UploadStatus.IDLE);

    async function upload(payload: VideoUploadPayload): Promise<Video | null> {
        setStatus(UploadStatus.UPLOADING);
        setProgress(null);

        const result = await video.create(payload, setProgress);

        if (result.ok) {
            setStatus(UploadStatus.DONE);
            return result.data;
        }

        setStatus(UploadStatus.ERROR);
        return null;
    }

    function reset() {
        setProgress(null);
        setStatus(UploadStatus.IDLE);
    }

    return { progress, status, upload, reset };
}
