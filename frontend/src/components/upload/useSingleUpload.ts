import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { video as videoApi, toVuid } from '@api';
import type { Vuid } from '@api';
import { videoUrl } from '@utils';
import { ToastType } from '@enums/toastType';
import { UploadStatus } from '@enums/uploadStatus';
import { useObjectUrl, useTusUpload } from '@hooks';
import { VideoStatus, type Tag, type Video } from '@models';

export interface FormState {
    title: string
    description: string
    tags: Tag[]
    videoFile: File | null
    thumbnailFile: File | null
    thumbnailPreviewUrl: string | null
    videoObjectUrl: string | null
    titleError: string | null
}

export interface UseSingleUploadDeps {
    addVideo: (video: Video) => void
    closeUploadModal: () => void
    addPollingVuid: (vuid: Vuid) => void
}

export interface UseSingleUploadReturn {
    form: FormState
    titleShakeKey: number
    isUploading: boolean
    isPaused: boolean
    hasPreview: boolean
    progress: ReturnType<typeof useTusUpload>['progress']
    pauseUpload: () => void
    resumeUpload: () => void
    handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    handleDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    handleTagsChange: (tags: Tag[]) => void
    handleThumbnailFile: (file: File) => void
    clearThumbnail: () => void
    handleVideoFile: (file: File) => void
    clearVideoFile: () => void
    handleSingleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
    runSingleUpload: () => Promise<void>
    resetForm: () => void
}

const INITIAL_FORM: FormState = {
    title: '',
    description: '',
    tags: [] as Tag[],
    videoFile: null,
    thumbnailFile: null,
    thumbnailPreviewUrl: null,
    videoObjectUrl: null,
    titleError: null,
};

/**
 * Owns the single-video upload flow: form state, object-URL previews, client
 * validation and the tus upload + finalize sequence.
 *
 * @param deps - Shared callbacks owned by the parent orchestrator.
 * @returns Single-mode form state and handlers consumed by `UploadSingleForm`.
 */
export function useSingleUpload({ addVideo, closeUploadModal, addPollingVuid }: UseSingleUploadDeps): UseSingleUploadReturn {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { progress, status: tusStatus, uploadFile, pause: pauseTus, resume: resumeTus, reset: resetTus } = useTusUpload();

    const videoPreview = useObjectUrl();
    const thumbnailPreview = useObjectUrl();

    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [titleShakeKey, setTitleShakeKey] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    // Paused uploads count as "uploading" for form-disabling, footer state and the
    // progress bar — pause() drops the underlying tus status back to IDLE, but the
    // upload session (and progress) is still active from the user's point of view.
    const isUploading = tusStatus === UploadStatus.UPLOADING || isPaused;
    const hasPreview = form.thumbnailPreviewUrl !== null || form.videoObjectUrl !== null;

    function pauseUpload() {
        pauseTus();
        setIsPaused(true);
    }

    function resumeUpload() {
        resumeTus();
        setIsPaused(false);
    }

    function handleThumbnailFile(file: File) {
        const previewUrl = thumbnailPreview.set(file);
        setForm(prev => ({ ...prev, thumbnailFile: file, thumbnailPreviewUrl: previewUrl }));
    }

    function clearThumbnail() {
        thumbnailPreview.clear();
        setForm(prev => ({ ...prev, thumbnailFile: null, thumbnailPreviewUrl: null }));
    }

    function handleVideoFile(file: File) {
        const objectUrl = videoPreview.set(file);
        setForm(prev => ({ ...prev, videoFile: file, videoObjectUrl: objectUrl }));
    }

    function clearVideoFile() {
        videoPreview.clear();
        setForm(prev => ({ ...prev, videoFile: null, videoObjectUrl: null }));
    }

    function resetForm() {
        videoPreview.clear();
        thumbnailPreview.clear();
        setForm(INITIAL_FORM);
        setIsPaused(false);
        resetTus();
    }

    function validateForm(): boolean {
        const isTitleEmpty = form.title.trim() === '';

        if (isTitleEmpty) {
            setForm(prev => ({ ...prev, titleError: t('video.title_required') }));
            setTitleShakeKey(k => k + 1);
            return false;
        }

        const hasNoVideoFile = form.videoFile === null;

        if (hasNoVideoFile) {
            dispatch(toastActions.addToast({ message: t('video.video_file_required'), type: ToastType.ERROR }));
            return false;
        }

        return true;
    }

    async function runSingleUpload() {
        const isValid = validateForm();

        if (!isValid) {
            return;
        }

        const videoResult = await uploadFile(form.videoFile!);
        const hasVideoError = videoResult === null;

        if (hasVideoError) {
            dispatch(toastActions.addToast({ message: t('toast.upload_error'), type: ToastType.ERROR }));
            return;
        }

        let thumbnailKey: string | undefined;
        const hasThumbnail = form.thumbnailFile !== null;

        if (hasThumbnail) {
            const thumbResult = await uploadFile(form.thumbnailFile!);
            thumbnailKey = thumbResult?.uploadKey;
        }

        const result = await videoApi.finalize({
            uploadKey: videoResult.uploadKey,
            thumbnailKey,
            title: form.title.trim(),
            description: form.description.trim(),
            tags: form.tags,
            status: VideoStatus.DRAFT,
        });

        if (!result.ok) {
            dispatch(toastActions.addToast({ message: t('toast.upload_error'), type: ToastType.ERROR }));
            return;
        }

        addVideo(result.data);
        addPollingVuid(toVuid(result.data.id));
        dispatch(toastActions.addToast({ message: t('video.processing_toast'), type: ToastType.INFO }));
        closeUploadModal();
        resetForm();
        navigate(videoUrl(result.data.id));
    }

    async function handleSingleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        await runSingleUpload();
    }

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm(prev => ({ ...prev, title: e.target.value, titleError: null }));
    }

    function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setForm(prev => ({ ...prev, description: e.target.value }));
    }

    function handleTagsChange(tags: Tag[]) {
        setForm(prev => ({ ...prev, tags }));
    }

    return {
        form,
        titleShakeKey,
        isUploading,
        isPaused,
        hasPreview,
        progress,
        pauseUpload,
        resumeUpload,
        handleTitleChange,
        handleDescriptionChange,
        handleTagsChange,
        handleThumbnailFile,
        clearThumbnail,
        handleVideoFile,
        clearVideoFile,
        handleSingleSubmit,
        runSingleUpload,
        resetForm,
    };
}
