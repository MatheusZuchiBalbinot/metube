import { useCallback, useState } from 'react';
import { useAppSelector } from '@store';
import { selectAllVideos } from '@store/videoSelectors';
import type { Vuid } from '@api';
import { UploadMode } from '@enums/uploadMode';
import { useVideoUi, useVideoActions, useAllTags } from '@hooks';
import type { Tag } from '@models';
import { useSingleUpload, type FormState, type UseSingleUploadReturn } from './useSingleUpload';
import { useBatchUpload, type BatchItem, type UseBatchUploadReturn } from './useBatchUpload';

export type { FormState, BatchItem };

export interface UseUploadModalReturn extends UseSingleUploadReturn, UseBatchUploadReturn {
    uploadModalOpen: boolean
    mode: UploadMode
    handleModeToSingle: () => void
    handleModeToBatch: () => void
    pollingVuids: Vuid[]
    isBusy: boolean
    handleClose: () => void
    cancelConfirmOpen: boolean
    confirmCancelUpload: () => void
    dismissCancelConfirm: () => void
    existingTags: Tag[]
}

/**
 * Thin orchestrator for the upload modal. Owns the active mode and the polling
 * queue, derives existing tags, and composes the single- and batch-upload hooks
 * — sharing `addVideo`, `closeUploadModal` and the polling callback between them.
 *
 * @returns The combined state and handlers consumed by `UploadModal`.
 */
export function useUploadModal(): UseUploadModalReturn {
    const { uploadModalOpen, closeUploadModal } = useVideoUi();
    const { addVideo } = useVideoActions();
    const allVideos = useAppSelector(selectAllVideos);

    const [mode, setMode] = useState<UploadMode>(UploadMode.SINGLE);
    const [pollingVuids, setPollingVuids] = useState<Vuid[]>([]);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

    const addPollingVuid = useCallback((vuid: Vuid) => {
        setPollingVuids(prev => [...prev, vuid]);
    }, []);

    const sharedDeps = { addVideo, closeUploadModal, addPollingVuid };
    const single = useSingleUpload(sharedDeps);
    const batch = useBatchUpload(sharedDeps);

    const existingTags = useAllTags(allVideos);

    const isBusy = single.isUploading || batch.isBatchUploading;

    function handleClose() {
        if (isBusy) {
            setCancelConfirmOpen(true);
            return;
        }

        closeUploadModal();
        single.resetForm();
        batch.resetBatch();
    }

    // Called from the cancel-upload confirmation dialog (and reused as the Cancel
    // button's handler while an upload is in flight) — aborts whatever is uploading
    // (single via the underlying tus client's abort/reset, batch per-item) before
    // closing, instead of leaving the upload to finish invisibly in the background.
    function confirmCancelUpload() {
        single.resetForm();
        batch.cancelBatchUpload();
        setCancelConfirmOpen(false);
        closeUploadModal();
    }

    function dismissCancelConfirm() {
        setCancelConfirmOpen(false);
    }

    function handleModeChange(next: UploadMode) {
        if (isBusy) {
            return;
        }

        setMode(next);
        single.resetForm();
        batch.resetBatch();
    }

    function handleModeToSingle() {
        handleModeChange(UploadMode.SINGLE);
    }

    function handleModeToBatch() {
        handleModeChange(UploadMode.BATCH);
    }

    return {
        ...single,
        ...batch,
        uploadModalOpen,
        mode,
        handleModeToSingle,
        handleModeToBatch,
        pollingVuids,
        isBusy,
        handleClose,
        cancelConfirmOpen,
        confirmCancelUpload,
        dismissCancelConfirm,
        existingTags,
    };
}
