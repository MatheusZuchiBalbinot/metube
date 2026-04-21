import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useVideo } from '@hooks/useVideo';
import { useUpload } from '@hooks/useUpload';
import { useVideoProcessingPoll } from '@hooks/useVideoProcessingPoll';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { Button, DragAndDrop, Input, Modal } from '@ui';
import { VideoStatus } from '@models/video';
import type { Tag } from '@models/tag';
import type { Vuid } from '@api/videos';
import { Format } from '@utils/format';
import TagInput from '@components/tag/input';
import DatePicker from '@ui/date/picker';
import Badge from '@ui/badge/badge';
import './modal.css';

interface FormState {
    title: string
    description: string
    tags: Tag[]
    videoFile: File | null
    thumbnailFile: File | null
    thumbnailPreviewUrl: string | null
    videoObjectUrl: string | null
    publishAt: string | null
    titleError: string | null
}

const INITIAL_FORM: FormState = {
    title: '',
    description: '',
    tags: [] as Tag[],
    videoFile: null,
    thumbnailFile: null,
    thumbnailPreviewUrl: null,
    videoObjectUrl: null,
    publishAt: null,
    titleError: null,
};

function computeStatus(publishAt: string | null): VideoStatus {
    const isPublishAtEmpty = publishAt === null;
    if (isPublishAtEmpty) {
        return VideoStatus.PUBLISHED;
    }

    const isInFuture = new Date(`${publishAt}T00:00:00`) > new Date();
    return isInFuture ? VideoStatus.SCHEDULED : VideoStatus.PUBLISHED;
}

export default function UploadModal() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { uploadModalOpen, closeUploadModal, addVideo } = useVideo();
    const { progress, status: uploadStatus, upload, reset: resetUpload } = useUpload();
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [titleShakeKey, setTitleShakeKey] = useState(0);
    const [pollingVuid, setPollingVuid] = useState<Vuid | null>(null);
    const videoObjectUrlRef = useRef<string | null>(null);
    const thumbObjectUrlRef = useRef<string | null>(null);

    const previewStatus = computeStatus(form.publishAt);
    const isScheduled = previewStatus === VideoStatus.SCHEDULED;
    const isUploading = uploadStatus === 'uploading';
    const hasPreview = form.thumbnailPreviewUrl !== null || form.videoObjectUrl !== null;

    useVideoProcessingPoll(pollingVuid);

    function handleThumbnailFile(file: File) {
        const hasPrevious = thumbObjectUrlRef.current !== null;
        if (hasPrevious) {
            URL.revokeObjectURL(thumbObjectUrlRef.current!);
        }

        const previewUrl = URL.createObjectURL(file);
        thumbObjectUrlRef.current = previewUrl;
        setForm(prev => ({ ...prev, thumbnailFile: file, thumbnailPreviewUrl: previewUrl }));
    }

    function clearThumbnail() {
        const hasPrevious = thumbObjectUrlRef.current !== null;
        if (hasPrevious) {
            URL.revokeObjectURL(thumbObjectUrlRef.current!);
            thumbObjectUrlRef.current = null;
        }

        setForm(prev => ({ ...prev, thumbnailFile: null, thumbnailPreviewUrl: null }));
    }

    function handleVideoFile(file: File) {
        const hasPrevious = videoObjectUrlRef.current !== null;
        if (hasPrevious) {
            URL.revokeObjectURL(videoObjectUrlRef.current!);
        }

        const objectUrl = URL.createObjectURL(file);
        videoObjectUrlRef.current = objectUrl;
        setForm(prev => ({ ...prev, videoFile: file, videoObjectUrl: objectUrl }));
    }

    function clearVideoFile() {
        const hasPrevious = videoObjectUrlRef.current !== null;
        if (hasPrevious) {
            URL.revokeObjectURL(videoObjectUrlRef.current!);
            videoObjectUrlRef.current = null;
        }

        setForm(prev => ({ ...prev, videoFile: null, videoObjectUrl: null }));
    }

    function revokeObjectUrls() {
        if (videoObjectUrlRef.current !== null) {
            URL.revokeObjectURL(videoObjectUrlRef.current);
            videoObjectUrlRef.current = null;
        }

        if (thumbObjectUrlRef.current !== null) {
            URL.revokeObjectURL(thumbObjectUrlRef.current);
            thumbObjectUrlRef.current = null;
        }
    }

    function resetForm() {
        revokeObjectUrls();
        setForm(INITIAL_FORM);
        resetUpload();
    }

    function handleClose() {
        const isBusy = isUploading;
        if (isBusy) {
            return;
        }

        closeUploadModal();
        resetForm();
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
            dispatch(toastActions.addToast({ message: t('video.video_file_required'), type: 'error' }));
            return false;
        }

        return true;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const isValid = validateForm();
        if (!isValid) {
            return;
        }

        const status = computeStatus(form.publishAt);
        const isScheduledStatus = status === VideoStatus.SCHEDULED;
        const scheduledAt = isScheduledStatus
            ? new Date(`${form.publishAt!}T00:00:00`).toISOString()
            : undefined;

        const result = await upload({
            title: form.title.trim(),
            description: form.description.trim(),
            tags: form.tags,
            status,
            scheduledAt,
            videoFile: form.videoFile!,
            thumbnail: form.thumbnailFile ?? undefined,
        });

        if (result === null) {
            dispatch(toastActions.addToast({ message: t('toast.upload_error'), type: 'error' }));
            return;
        }

        addVideo(result);
        setPollingVuid(result.id as unknown as Vuid);
        dispatch(toastActions.addToast({ message: t('toast.video_uploaded'), type: 'success' }));
        closeUploadModal();
        resetForm();
    }

    return (
        <Modal
            isOpen={uploadModalOpen}
            onClose={handleClose}
            title={t('video.upload')}
            size="lg"
            footer={
                <div className="upload-modal__footer">
                    <Button variant="ghost" size="md" onClick={handleClose} disabled={isUploading}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="primary" size="md" onClick={handleSubmit} disabled={isUploading}>
                        {isUploading ? t('video.uploading') : t('video.upload_submit')}
                    </Button>
                </div>
            }
        >
            <form className="upload-modal__form" onSubmit={handleSubmit}>
                <div key={titleShakeKey} className={titleShakeKey > 0 && form.titleError ? 'animate-shake' : ''}>
                    <Input
                        id="um-title"
                        label={t('video.upload_title')}
                        placeholder={t('video.upload_title')}
                        value={form.title}
                        error={form.titleError ?? undefined}
                        onChange={e => setForm(prev => ({ ...prev, title: e.target.value, titleError: null }))}
                        disabled={isUploading}
                    />
                </div>

                <div className="upload-modal__field">
                    <label className="upload-modal__label" htmlFor="um-desc">{t('video.upload_description')}</label>
                    <textarea
                        id="um-desc"
                        className="upload-modal__textarea"
                        placeholder={t('video.describe_placeholder')}
                        rows={3}
                        value={form.description}
                        onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                        disabled={isUploading}
                    />
                </div>

                <div className="upload-modal__field">
                    <label className="upload-modal__label">{t('video.upload_tags')}</label>
                    <TagInput
                        value={form.tags}
                        onChange={tags => setForm(prev => ({ ...prev, tags }))}
                        placeholder={t('video.tags_placeholder')}
                    />
                </div>

                <div className="upload-modal__row">
                    <div className="upload-modal__field">
                        <label className="upload-modal__label">{t('video.upload_thumbnail')}</label>
                        <DragAndDrop
                            accept="image/*"
                            maxSizeMB={10}
                            label={t('video.drag_image')}
                            sublabel={t('video.drag_image_sub')}
                            onFileSelect={handleThumbnailFile}
                            onClear={clearThumbnail}
                        />
                    </div>

                    <div className="upload-modal__field">
                        <label className="upload-modal__label">{t('video.upload_video_file')}</label>
                        <DragAndDrop
                            accept="video/*"
                            maxSizeMB={2048}
                            label={t('video.drag_video')}
                            sublabel={t('video.drag_video_sub')}
                            onFileSelect={handleVideoFile}
                            onClear={clearVideoFile}
                        />
                    </div>
                </div>

                {hasPreview && (
                    <div className="upload-modal__field">
                        <label className="upload-modal__label">{t('video.preview')}</label>
                        <div className="upload-modal__preview-strip">
                            {form.thumbnailPreviewUrl !== null && (
                                <div className="upload-modal__preview-item">
                                    <span className="upload-modal__preview-caption">
                                        {t('video.upload_thumbnail')}
                                    </span>
                                    <img
                                        className="upload-modal__preview-media"
                                        src={form.thumbnailPreviewUrl}
                                        alt={t('video.upload_thumbnail')}
                                    />
                                </div>
                            )}
                            {form.videoObjectUrl !== null && (
                                <div className="upload-modal__preview-item">
                                    <span className="upload-modal__preview-caption">
                                        {t('video.upload_video_file')}
                                    </span>
                                    <video
                                        className="upload-modal__preview-media"
                                        src={form.videoObjectUrl}
                                        controls
                                        muted
                                        preload="metadata"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isUploading && progress !== null && (
                    <div className="upload-modal__progress">
                        <div className="upload-modal__progress-bar">
                            <div
                                className="upload-modal__progress-fill"
                                style={{ width: `${progress.percent}%` }}
                            />
                        </div>
                        <div className="upload-modal__progress-info">
                            <span>{Format.percent(progress.percent)}</span>
                            <span>{Format.speed(progress.bytesPerSec)}</span>
                            <span>{Format.eta(progress.eta)}</span>
                        </div>
                    </div>
                )}

                <div className="upload-modal__field">
                    <label className="upload-modal__label" htmlFor="um-publish-at">
                        {t('video.upload_publish_at')}
                    </label>
                    <DatePicker
                        id="um-publish-at"
                        value={form.publishAt}
                        onChange={v => setForm(prev => ({ ...prev, publishAt: v }))}
                    />
                    <div className="upload-modal__status-preview">
                        <span className="upload-modal__status-label">{t('video.status_label')}:</span>
                        <Badge variant={isScheduled ? 'warning' : 'success'}>
                            {isScheduled ? t('video.scheduled') : t('video.published_now')}
                        </Badge>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
