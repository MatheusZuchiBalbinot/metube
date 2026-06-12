import { useRef, useState } from 'react';
import type * as tus from 'tus-js-client';
import { createTusUpload } from '@lib/tus';
import { UploadStatus } from '@enums/uploadStatus';
import type { UploadProgress } from '@utils';

export type { UploadStatus };

export interface TusUploadResult {
    uploadKey: string
}

interface UseTusUploadReturn {
    progress: UploadProgress | null
    status: UploadStatus
    uploadFile: (file: File) => Promise<TusUploadResult | null>
    pause: () => void
    resume: () => void
    reset: () => void
}

function buildTusProgress(bytesUploaded: number, bytesTotal: number, startTime: number): UploadProgress {
    const percent = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
    const elapsedSec = (Date.now() - startTime) / 1_000;
    const speed = elapsedSec > 0 ? bytesUploaded / elapsedSec : 0;
    const remaining = speed > 0 ? (bytesTotal - bytesUploaded) / speed : 0;
    return { loaded: bytesUploaded, total: bytesTotal, percent, speed, remaining };
}

export function useTusUpload(): UseTusUploadReturn {
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [status, setStatus] = useState<UploadStatus>(UploadStatus.IDLE);
    const uploadRef = useRef<tus.Upload | null>(null);

    function uploadFile(file: File): Promise<TusUploadResult | null> {
        return new Promise((resolve) => {
            const startTime = Date.now();

            const upload = createTusUpload(file, {
                onError: () => {
                    setStatus(UploadStatus.ERROR);
                    resolve(null);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    setProgress(buildTusProgress(bytesUploaded, bytesTotal, startTime));
                },
                onSuccess: (uploadKey) => {
                    const isKeyMissing = uploadKey === null;
                    if (isKeyMissing) {
                        setStatus(UploadStatus.ERROR);
                        resolve(null);
                        return;
                    }
                    setStatus(UploadStatus.DONE);
                    resolve({ uploadKey });
                },
            });

            uploadRef.current = upload;

            upload.findPreviousUploads().then((previousUploads) => {
                const hasPrevious = previousUploads.length > 0;
                if (hasPrevious) {
                    upload.resumeFromPreviousUpload(previousUploads[0]);
                }
                upload.start();
                setStatus(UploadStatus.UPLOADING);
            }).catch(() => {
                upload.start();
                setStatus(UploadStatus.UPLOADING);
            });
        });
    }

    function pause(): void {
        uploadRef.current?.abort();
        setStatus(UploadStatus.IDLE);
    }

    function resume(): void {
        uploadRef.current?.start();
        setStatus(UploadStatus.UPLOADING);
    }

    function reset(): void {
        uploadRef.current?.abort();
        uploadRef.current = null;
        setProgress(null);
        setStatus(UploadStatus.IDLE);
    }

    return { progress, status, uploadFile, pause, resume, reset };
}
