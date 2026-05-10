import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useVideo } from '@hooks/useVideo';
import { useUpload } from '@hooks/useUpload';
import { useVideoProcessingPoll } from '@hooks/useVideoProcessingPoll';
import { useAppDispatch, useAppSelector } from '@store';
import { toastActions } from '@store/toastSlice';
import { Button, DragAndDrop, Input, Modal } from '@ui';
import { VideoStatus } from '@models/video';
import { video as videoApi } from '@api/videos';
import type { Tag } from '@models/tag';
import type { Vuid } from '@api/videos';
import { Format } from '@utils/format';
import TagInput from '@components/tag/input';
import DatePicker from '@ui/date/picker';
import Badge from '@ui/badge/badge';
import './modal.css';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = 'single' | 'batch';

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

interface BatchItem {
    id: string
    file: File
    title: string
    status: 'pending' | 'uploading' | 'done' | 'error'
    progress: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function titleFromFilename(file: File): string {
    const base = file.name.replace(/\.[^.]+$/, '');
    // eslint-disable-next-line no-useless-escape
    const cleaned = base.replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || file.name;
}

// ─── Component ────────────────────────────────────────────────────────────────

// eslint-disable-next-line complexity
export default function UploadModal() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { uploadModalOpen, closeUploadModal, addVideo } = useVideo();
    const { progress, status: uploadStatus, upload, reset: resetUpload } = useUpload();
    const allVideos = useAppSelector(s => s.video.videos);

    const existingTags = useMemo(() => {
        const tagSet = new Set<string>();

        for (const v of allVideos) {
            for (const tag of v.tags) {
                tagSet.add(tag as string);
            }
        }

        return Array.from(tagSet).sort() as unknown as Tag[];
    }, [allVideos]);

    const [mode, setMode] = useState<ModalMode>('single');

    // ─── Single mode state ────────────────────────────────────────────────────
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [titleShakeKey, setTitleShakeKey] = useState(0);
    const [pollingVuid, setPollingVuid] = useState<Vuid | null>(null);
    const videoObjectUrlRef = useRef<string | null>(null);
    const thumbObjectUrlRef = useRef<string | null>(null);

    // ─── Batch mode state ─────────────────────────────────────────────────────
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [isBatchUploading, setIsBatchUploading] = useState(false);
    const [batchDragging, setBatchDragging] = useState(false);
    const batchInputRef = useRef<HTMLInputElement>(null);

    const previewStatus = computeStatus(form.publishAt);
    const isScheduled = previewStatus === VideoStatus.SCHEDULED;
    const isUploading = uploadStatus === 'uploading';
    const hasPreview = form.thumbnailPreviewUrl !== null || form.videoObjectUrl !== null;
    const isBusy = isUploading || isBatchUploading;

    const batchPending = batchItems.filter(i => i.status === 'pending');
    const batchHasItems = batchItems.length > 0;

    useVideoProcessingPoll(pollingVuid);

    // ─── Single mode handlers ─────────────────────────────────────────────────

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

    function resetSingleForm() {
        revokeObjectUrls();
        setForm(INITIAL_FORM);
        resetUpload();
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

    async function handleSingleSubmit(e: React.FormEvent) {
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
        resetSingleForm();
    }

    // ─── Batch mode handlers ──────────────────────────────────────────────────

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

    function handleBatchDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setBatchDragging(false);
        addBatchFiles(e.dataTransfer.files);
    }

    async function handleBatchUpload() {
        const toUpload = batchItems.filter(i => i.status === 'pending');
        const hasNothing = toUpload.length === 0;
        if (hasNothing) {
            return;
        }

        setIsBatchUploading(true);
        let doneCount = 0;
        let errorCount = 0;

        await Promise.all(toUpload.map(async (item) => {
            setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'uploading' } : i));

            const result = await videoApi.create(
                { title: item.title, description: '', tags: [], status: VideoStatus.PUBLISHED, videoFile: item.file },
                // eslint-disable-next-line max-nested-callbacks
                (p) => setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: p.percent } : i)),
            );

            if (result) {
                doneCount++;
                addVideo(result);
            } else {
                errorCount++;
            }

            setBatchItems(prev => prev.map(i =>
                i.id === item.id
                    ? { ...i, status: result ? 'done' : 'error', progress: result ? 100 : i.progress }
                    : i,
            ));
        }));

        setIsBatchUploading(false);

        if (doneCount > 0) {
            dispatch(toastActions.addToast({
                message: t('toast.batch_uploaded', { count: doneCount }),
                type: 'success',
            }));
        }

        if (errorCount > 0) {
            dispatch(toastActions.addToast({
                message: t('toast.batch_upload_error', { count: errorCount }),
                type: 'error',
            }));
        }

        const allDone = errorCount === 0;
        if (allDone) {
            closeUploadModal();
            setBatchItems([]);
        }
    }

    // ─── Form field handlers ──────────────────────────────────────────────────

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm(prev => ({ ...prev, title: e.target.value, titleError: null }));
    }

    function handleDescriptionChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
        setForm(prev => ({ ...prev, description: e.target.value }));
    }

    function handleTagsChange(tags: Tag[]) {
        setForm(prev => ({ ...prev, tags }));
    }

    function handlePublishAtChange(v: string | null) {
        setForm(prev => ({ ...prev, publishAt: v }));
    }

    function handleModeToSingle() {
        handleModeChange('single');
    }

    function handleModeToBatch() {
        handleModeChange('batch');
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

    // ─── Common handlers ──────────────────────────────────────────────────────

    function handleClose() {
        if (isBusy) {
            return;
        }
        closeUploadModal();
        resetSingleForm();
        setBatchItems([]);
    }

    function handleModeChange(next: ModalMode) {
        if (isBusy) {
            return;
        }
        setMode(next);
        resetSingleForm();
        setBatchItems([]);
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    const footerSingle = (
        <div className="upload-modal__footer">
            <Button variant="ghost" size="md" onClick={handleClose} disabled={isBusy}>
                {t('common.cancel')}
            </Button>
            <Button variant="primary" size="md" onClick={handleSingleSubmit} disabled={isBusy}>
                {isUploading ? t('video.uploading') : t('video.upload_submit')}
            </Button>
        </div>
    );

    const footerBatch = (
        <div className="upload-modal__footer">
            <Button variant="ghost" size="md" onClick={handleClose} disabled={isBusy}>
                {t('common.cancel')}
            </Button>
            <Button
                variant="primary"
                size="md"
                onClick={handleBatchUpload}
                disabled={isBatchUploading || batchPending.length === 0}
            >
                {isBatchUploading
                    ? t('video.uploading')
                    : t('video.batch_upload_submit', { count: batchPending.length })}
            </Button>
        </div>
    );

    return (
        <Modal
            isOpen={uploadModalOpen}
            onClose={handleClose}
            title={t('video.upload')}
            size="lg"
            footer={mode === 'single' ? footerSingle : footerBatch}
        >
            {/* Mode tabs */}
            <div role="tablist" className="upload-modal__tabs">
                <Button
                    variant="ghost"
                    size="sm"
                    role="tab"
                    aria-selected={mode === 'single'}
                    className={['upload-modal__tab', mode === 'single' ? 'upload-modal__tab--active' : ''].filter(Boolean).join(' ')}
                    onClick={handleModeToSingle}
                >
                    {t('video.upload_mode_single')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    role="tab"
                    aria-selected={mode === 'batch'}
                    className={['upload-modal__tab', mode === 'batch' ? 'upload-modal__tab--active' : ''].filter(Boolean).join(' ')}
                    onClick={handleModeToBatch}
                >
                    {t('video.upload_mode_batch')}
                </Button>
            </div>

            {/* ── Single mode ── */}
            {mode === 'single' && (
                <form className="upload-modal__form" onSubmit={handleSingleSubmit}>
                    <div key={titleShakeKey} className={titleShakeKey > 0 && form.titleError ? 'animate-shake' : ''}>
                        <Input
                            id="um-title"
                            label={t('video.upload_title')}
                            placeholder={t('video.upload_title')}
                            value={form.title}
                            error={form.titleError ?? undefined}
                            onChange={handleTitleChange}
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
                            onChange={handleDescriptionChange}
                            disabled={isUploading}
                        />
                    </div>

                    <div className="upload-modal__field">
                        <label className="upload-modal__label">{t('video.upload_tags')}</label>
                        <TagInput
                            value={form.tags}
                            onChange={handleTagsChange}
                            placeholder={t('video.tags_placeholder')}
                            suggestions={existingTags}
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
                                <span>{Format.speed(progress.speed)}</span>
                                <span>{Format.eta(progress.remaining)}</span>
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
                            onChange={handlePublishAtChange}
                        />
                        <div className="upload-modal__status-preview">
                            <span className="upload-modal__status-label">{t('video.status_label')}:</span>
                            <Badge variant={isScheduled ? 'warning' : 'success'}>
                                {isScheduled ? t('video.scheduled') : t('video.published_now')}
                            </Badge>
                        </div>
                    </div>
                </form>
            )}

            {/* ── Batch mode ── */}
            {mode === 'batch' && (
                <div className="upload-modal__batch">
                    {/* Multi-file drop zone */}
                    <div
                        className={['upload-modal__batch-drop', batchDragging ? 'upload-modal__batch-drop--dragging' : ''].filter(Boolean).join(' ')}
                        onDragOver={handleBatchDragOver}
                        onDragLeave={handleBatchDragLeave}
                        onDrop={handleBatchDrop}
                        onClick={handleBatchZoneClick}
                    >
                        <input
                            ref={batchInputRef}
                            type="file"
                            accept="video/*"
                            multiple
                            className="dnd-input"
                            onChange={handleBatchInputChange}
                        />
                        <p className="upload-modal__batch-drop-label">{t('video.batch_drop')}</p>
                        <p className="upload-modal__batch-drop-sub">{t('video.batch_drop_sub')}</p>
                    </div>

                    {/* Item list */}
                    {batchHasItems && (
                        <div className="upload-modal__batch-list">
                            {batchItems.map(item => (
                                <div key={item.id} className={`upload-modal__batch-item upload-modal__batch-item--${item.status}`}>
                                    <div className="upload-modal__batch-item-body">
                                        <Input
                                            className="upload-modal__batch-title"
                                            value={item.title}
                                            onChange={e => updateBatchTitle(item.id, e.target.value)}
                                            disabled={item.status !== 'pending'}
                                            placeholder={t('video.upload_title')}
                                        />
                                        <span className="upload-modal__batch-filename">{item.file.name}</span>
                                        {item.status === 'uploading' && (
                                            <div className="upload-modal__batch-progress">
                                                <div
                                                    className="upload-modal__batch-progress-fill"
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="upload-modal__batch-item-side">
                                        {item.status === 'pending' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="upload-modal__batch-remove"
                                                onClick={() => removeBatchItem(item.id)}
                                                aria-label={t('video.batch_remove')}
                                            >
                                                <Trash2 size={13} />
                                            </Button>
                                        )}
                                        {item.status === 'uploading' && (
                                            <span className="upload-modal__batch-pct">{Math.round(item.progress)}%</span>
                                        )}
                                        {item.status === 'done' && (
                                            <CheckCircle2 size={16} className="upload-modal__batch-done" />
                                        )}
                                        {item.status === 'error' && (
                                            <AlertCircle size={16} className="upload-modal__batch-error" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
