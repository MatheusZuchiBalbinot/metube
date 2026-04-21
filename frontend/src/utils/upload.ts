import type { AxiosProgressEvent } from 'axios';

export interface UploadProgress {
    loaded: number
    total: number
    percent: number
    speed: number
    remaining: number
}

export type ProgressCallback = (progress: UploadProgress) => void;

export function buildProgress(event: AxiosProgressEvent, startTime: number): UploadProgress {
    const loaded = event.loaded;
    const total = event.total ?? loaded;
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
    const elapsedSec = (Date.now() - startTime) / 1_000;
    const speed = elapsedSec > 0 ? loaded / elapsedSec : 0;
    const remaining = speed > 0 ? (total - loaded) / speed : 0;

    return { loaded, total, percent, speed, remaining };
}
