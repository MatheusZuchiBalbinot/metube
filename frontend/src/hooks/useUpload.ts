import { useState } from 'react';
import { video } from '@api/videos';
import type { VideoUploadPayload } from '@api/videos';
import type { Video } from '@models/video';
import type { UploadProgress } from '@utils/upload';
import { UploadStatus } from '@enums/uploadStatus';

export type { UploadStatus } from '@enums/uploadStatus';

export function useUpload() {
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [status, setStatus] = useState<UploadStatus>(UploadStatus.IDLE);

    async function upload(payload: VideoUploadPayload): Promise<Video | null> {
        setStatus(UploadStatus.UPLOADING);
        setProgress(null);

        const result = await video.create(payload, setProgress);

        if (result) {
            setStatus(UploadStatus.DONE);
        } else {
            setStatus(UploadStatus.ERROR);
        }

        return result;
    }

    function reset() {
        setProgress(null);
        setStatus(UploadStatus.IDLE);
    }

    return { progress, status, upload, reset };
}
