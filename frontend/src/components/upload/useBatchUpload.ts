import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { video as videoApi, toVuid } from '@api';
import type { Vuid } from '@api';
import { uploadViaTus } from '@lib/tus';
import { ToastType } from '@enums/toastType';
import { VideoStatus, type Video } from '@models';

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
 *
 * @param deps - Shared callbacks owned by the parent orchestrator.
 * @returns Batch-mode state and handlers consumed by `UploadBatchZone`.
 */
export function useBatchUpload({ addVideo, closeUploadModal, addPollingVuid }: UseBatchUploadDeps): UseBatchUploadReturn {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [isBatchUploading, setIsBatchUploading] = useState(false);
    const [batchDragging, setBatchDragging] = useState(false);
    const batchInputRef = useRef<HTMLInputElement | null>(null);

    const batchPending = batchItems.filter(i => i.status === 'pending');
    const batchHasItems = batchItems.length > 0;

    function addBatchFiles(files: FileList | File[]) {
        const newItems: BatchItem[] = Array.from(files)
            .filter(f => f.type.startsWith('video/'))
            .map(f => ({
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

    async function uploadBatchItem(item: BatchItem): Promise<'done' | 'error'> {
        setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

        function onBatchProgress(pct: number) {
            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct } : i));
        }

        const uploadKey = await uploadViaTus(item.file, onBatchProgress);
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
        resetBatch,
    };
}
