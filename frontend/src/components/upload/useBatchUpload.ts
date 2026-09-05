import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type * as tus from 'tus-js-client';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { video as videoApi, toVuid } from '@api';
import type { Vuid } from '@api';
import { createTusUpload } from '@lib/tus';
import { ToastType } from '@enums/toastType';
import { VideoStatus, type Video } from '@models';
import { VIDEO_MAX_SIZE_MB } from '@utils';

export interface BatchItem {
    id: string
    file: File
    title: string
    status: 'pending' | 'uploading' | 'done' | 'error'
    progress: number
}

export interface UseBatchUploadDeps {
    addVideo: (video: Video) => void
    closeUploadModal: () => void
    addPollingVuid: (vuid: Vuid) => void
}

export interface UseBatchUploadReturn {
    batchItems: BatchItem[]
    isBatchUploading: boolean
    batchDragging: boolean
    batchPending: BatchItem[]
    batchHasItems: boolean
    batchInputRef: React.RefObject<HTMLInputElement | null>
    addBatchFiles: (files: FileList | File[]) => void
    removeBatchItem: (id: string) => void
    updateBatchTitle: (id: string, title: string) => void
    handleBatchDrop: (e: React.DragEvent<HTMLDivElement>) => void
    handleBatchDragOver: (e: React.DragEvent<HTMLDivElement>) => void
    handleBatchDragLeave: () => void
    handleBatchZoneClick: () => void
    handleBatchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleBatchUpload: () => Promise<void>
    retryBatchItem: (id: string) => void
    cancelBatchUpload: () => void
    resetBatch: () => void
}

function titleFromFilename(file: File): string {
    const base = file.name.replace(/\.[^.]+$/, '');
    // eslint-disable-next-line no-useless-escape
    const cleaned = base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || file.name;
}

/**
 * Owns the batch upload flow: queue of files, drag-and-drop intake and the
 * parallel tus upload + finalize sequence with success/error counters.
 */
export function useBatchUpload({ addVideo, closeUploadModal, addPollingVuid }: UseBatchUploadDeps): UseBatchUploadReturn {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [isBatchUploading, setIsBatchUploading] = useState(false);
    const [batchDragging, setBatchDragging] = useState(false);
    const batchInputRef = useRef<HTMLInputElement | null>(null);
    // Tracks the in-flight tus.Upload instance per batch item id so a cancel/retry
    // action can abort a specific transfer without touching the others.
    const uploadRefs = useRef<Map<string, tus.Upload>>(new Map());

    const batchPending = batchItems.filter(i => i.status === 'pending');
    const batchHasItems = batchItems.length > 0;

    function isDuplicateOf(file: File, other: File): boolean {
        return other.name === file.name && other.size === file.size;
    }

    function addBatchFiles(files: FileList | File[]) {
        const accepted: File[] = [];

        Array.from(files)
            .filter(f => f.type.startsWith('video/'))
            .forEach(f => {
                const isTooLarge = f.size > VIDEO_MAX_SIZE_MB * 1024 * 1024;
                if (isTooLarge) {
                    dispatch(toastActions.addToast({
                        message: t('toast.batch_file_too_large', { name: f.name, maxSizeMB: VIDEO_MAX_SIZE_MB }),
                        type: ToastType.ERROR,
                    }));
                    return;
                }

                const isDuplicate = batchItems.some(i => isDuplicateOf(f, i.file)) || accepted.some(a => isDuplicateOf(f, a));
                if (isDuplicate) {
                    dispatch(toastActions.addToast({
                        message: t('toast.batch_file_duplicate', { name: f.name }),
                        type: ToastType.ERROR,
                    }));
                    return;
                }

                accepted.push(f);
            });

        const newItems: BatchItem[] = accepted.map(f => ({
            id: crypto.randomUUID(),
            file: f,
            title: titleFromFilename(f),
            status: 'pending' as const,
            progress: 0,
        }));

        setBatchItems(prev => [...prev, ...newItems]);
    }

    function removeBatchItem(id: string) {
        setBatchItems(prev => prev.filter(i => i.id !== id));
    }

    function updateBatchTitle(id: string, title: string) {
        setBatchItems(prev => prev.map(i => i.id === id ? { ...i, title } : i));
    }

    function handleBatchDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setBatchDragging(false);
        addBatchFiles(e.dataTransfer.files);
    }

    function handleBatchDragOver(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setBatchDragging(true);
    }

    function handleBatchDragLeave() {
        setBatchDragging(false);
    }

    function handleBatchZoneClick() {
        const canClick = !isBatchUploading;

        if (canClick) {
            batchInputRef.current?.click();
        }
    }

    function handleBatchInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            addBatchFiles(e.target.files);
        }

        e.target.value = '';
    }

    // Wraps `createTusUpload` (rather than the fire-and-forget `uploadViaTus`) so the
    // resulting `tus.Upload` instance can be stashed in `uploadRefs` and aborted later
    // by id — `uploadViaTus` never hands the instance back to its caller.
    function uploadFileTracked(item: BatchItem, onProgress: (percent: number) => void): Promise<string | null> {
        return new Promise((resolve) => {
            const upload = createTusUpload(item.file, {
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percent = bytesTotal > 0 ? Math.round((bytesUploaded / bytesTotal) * 100) : 0;
                    onProgress(percent);
                },
                onError: () => {
                    uploadRefs.current.delete(item.id);
                    resolve(null);
                },
                onSuccess: (uploadKey) => {
                    uploadRefs.current.delete(item.id);
                    resolve(uploadKey);
                },
            });

            uploadRefs.current.set(item.id, upload);
            upload.start();
        });
    }

    async function uploadBatchItem(item: BatchItem): Promise<'done' | 'error'> {
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

        function onBatchProgress(pct: number) {
            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct } : i));
        }

        const uploadKey = await uploadFileTracked(item, onBatchProgress);
        const hasUploadError = uploadKey === null;

        if (hasUploadError) {
            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
            return 'error';
        }

        const result = await videoApi.finalize({
            uploadKey,
            title: item.title,
            description: '',
            tags: [],
            status: VideoStatus.PUBLISHED,
            is_batch: true,
        });

        if (result.ok) {
            addVideo(result.data);
            addPollingVuid(toVuid(result.data.id));
        }

        setBatchItems(prev => prev.map(i =>
            i.id === item.id
                ? { ...i, status: result.ok ? 'done' : 'error', progress: result.ok ? 100 : i.progress }
                : i,
        ));

        return result.ok ? 'done' : 'error';
    }

    async function handleBatchUpload() {
        const toUpload = batchItems.filter(i => i.status === 'pending');
        const hasNothing = toUpload.length === 0;

        if (hasNothing) {
            return;
        }

        setIsBatchUploading(true);

        const outcomes = await Promise.all(toUpload.map(uploadBatchItem));
        const doneCount = outcomes.filter(o => o === 'done').length;
        const errorCount = outcomes.filter(o => o === 'error').length;

        setIsBatchUploading(false);

        if (doneCount > 0) {
            dispatch(toastActions.addToast({
                message: t('toast.batch_uploaded', { count: doneCount }),
                type: ToastType.SUCCESS,
            }));
        }

        if (errorCount > 0) {
            dispatch(toastActions.addToast({
                message: t('toast.batch_upload_error', { count: errorCount }),
                type: ToastType.ERROR,
            }));
        }

        const allDone = errorCount === 0;

        if (allDone) {
            closeUploadModal();
            setBatchItems([]);
        }
    }

    function retryBatchItem(id: string) {
        const item = batchItems.find(i => i.id === id);
        const canRetry = item !== undefined && item.status === 'error';

        if (!canRetry) {
            return;
        }

        void uploadBatchItem({ ...item, status: 'pending', progress: 0 });
    }

    // Aborts every in-flight tus upload and drops the queue. Aborted transfers never
    // reach `onError`/`onSuccess`, so their `uploadBatchItem` promises are left to hang
    // — harmless, since the caller (a full modal close) no longer awaits their outcome
    // and this deliberately skips the done/error toasts a completed run would show.
    function cancelBatchUpload() {
        uploadRefs.current.forEach(upload => upload.abort());
        uploadRefs.current.clear();
        setIsBatchUploading(false);
        setBatchItems([]);
    }

    function resetBatch() {
        setBatchItems([]);
    }

    return {
        batchItems,
        isBatchUploading,
        batchDragging,
        batchPending,
        batchHasItems,
        batchInputRef,
        addBatchFiles,
        removeBatchItem,
        updateBatchTitle,
        handleBatchDrop,
        handleBatchDragOver,
        handleBatchDragLeave,
        handleBatchZoneClick,
        handleBatchInputChange,
        handleBatchUpload,
        retryBatchItem,
        cancelBatchUpload,
        resetBatch,
    };
}
