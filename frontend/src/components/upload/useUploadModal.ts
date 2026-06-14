import { useCallback, useMemo, useState } from 'react';
import { useAppSelector } from '@store';
import { selectAllVideos } from '@store/videoSelectors';
import type { Vuid } from '@api';
import { UploadMode } from '@enums/uploadMode';
import { useVideoUi, useVideoActions } from '@hooks';
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

    const addPollingVuid = useCallback((vuid: Vuid) => {
        setPollingVuids(prev => [...prev, vuid]);
    }, []);

    const sharedDeps = { addVideo, closeUploadModal, addPollingVuid };
    const single = useSingleUpload(sharedDeps);
    const batch = useBatchUpload(sharedDeps);

    const existingTags = useMemo(() => {
        const tagSet = new Set<Tag>();

        for (const video of allVideos) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }

        return Array.from(tagSet).sort();
    }, [allVideos]);

    const isBusy = single.isUploading || batch.isBatchUploading;

    function handleClose() {
        if (isBusy) {
            return;
        }

        closeUploadModal();
        single.resetForm();
        batch.resetBatch();
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
        existingTags,
    };
}
