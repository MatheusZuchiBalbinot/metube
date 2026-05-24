import { useMemo, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import * as tus from 'tus-js-client';
import { useAppDispatch, useAppSelector } from '@store';
import { toastActions } from '@store/toastSlice';
import { Button, DragAndDrop, Input, Modal } from '@ui';
import { video as videoApi, toVuid } from '@api';
import type { Vuid } from '@api';
import { Format, formatEta, cn } from '@utils';
import TagInput from '@components/tag/input';
import DatePicker from '@ui/date/picker';
import Badge from '@ui/badge/badge';
import './modal.css';
import { ToastType } from '@enums/toastType';
import { UploadMode } from '@enums/uploadMode';
import { UploadStatus } from '@enums/uploadStatus';
import { useVideo, useTusUpload, useVideoProcessingPoll } from '@hooks';
import { VideoStatus, type Tag } from '@models';
import UploadPreview from './uploadPreview';
import BatchItemRow from './batchItemRow';

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface BatchItem {
    id: string
    file: File
    title: string
    status: 'pending' | 'uploading' | 'done' | 'error'
    progress: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TUS_CHUNK_SIZE = 5 * 1024 * 1024;
const TUS_RETRY_DELAYS = [0, 1_000, 3_000, 5_000, 10_000];

function uploadViaTus(file: File, onProgress: (pct: number) => void): Promise<string | null> {
    return new Promise(resolve => {
        const upload = new tus.Upload(file, {
            endpoint: '/api/uploads/tus',
            retryDelays: TUS_RETRY_DELAYS,
            chunkSize: TUS_CHUNK_SIZE,
            metadata: { filename: file.name, filetype: file.type },
            onError: () => resolve(null),
            onProgress: (loaded, total) => {
                const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
                onProgress(pct);
            },
            onSuccess: () => {
                const url = upload.url;
                const isUrlMissing = url === null || url === undefined;
                if (isUrlMissing) {
                    resolve(null);
                    return;
                }
                resolve(url.split('/').pop() ?? null);
            },
        });
        upload.start();
    });
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
    const { progress, status: tusStatus, uploadFile, reset: resetTus } = useTusUpload();
    const allVideos = useAppSelector(s => s.video.videos);

    const existingTags = useMemo(() => {
        const tagSet = new Set<Tag>();

        for (const video of allVideos) {
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }

        return Array.from(tagSet).sort();
    }, [allVideos]);

    const [mode, setMode] = useState<UploadMode>(UploadMode.SINGLE);

    // ─── Single mode state ────────────────────────────────────────────────────
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [titleShakeKey, setTitleShakeKey] = useState(0);
    const [pollingVuids, setPollingVuids] = useState<Vuid[]>([]);
    const videoObjectUrlRef = useRef<string | null>(null);
    const thumbObjectUrlRef = useRef<string | null>(null);

    // ─── Batch mode state ─────────────────────────────────────────────────────
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [isBatchUploading, setIsBatchUploading] = useState(false);
    const [batchDragging, setBatchDragging] = useState(false);
    const batchInputRef = useRef<HTMLInputElement>(null);

    const previewStatus = computeStatus(form.publishAt);
    const isScheduled = previewStatus === VideoStatus.SCHEDULED;
    const isUploading = tusStatus === UploadStatus.UPLOADING;
    const hasPreview = form.thumbnailPreviewUrl !== null || form.videoObjectUrl !== null;
    const isBusy = isUploading || isBatchUploading;

    const batchPending = batchItems.filter(i => i.status === 'pending');
    const batchHasItems = batchItems.length > 0;

    useVideoProcessingPoll(pollingVuids);

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

        const status = computeStatus(form.publishAt);
        const isScheduledStatus = status === VideoStatus.SCHEDULED;
        const scheduledAt = isScheduledStatus
            ? new Date(`${form.publishAt!}T00:00:00`).toISOString()
            : undefined;

        const result = await videoApi.finalize({
            uploadKey: videoResult.uploadKey,
            thumbnailKey,
            title: form.title.trim(),
            description: form.description.trim(),
            tags: form.tags,
            status,
            scheduledAt,
        });

        if (!result.ok) {
            dispatch(toastActions.addToast({ message: t('toast.upload_error'), type: ToastType.ERROR }));
            return;
        }

        addVideo(result.data);
        setPollingVuids(prev => [...prev, toVuid(result.data.id)]);
        dispatch(toastActions.addToast({ message: t('video.processing_toast'), type: ToastType.INFO }));
        closeUploadModal();
        resetSingleForm();
    }

    async function handleSingleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        await runSingleUpload();
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

            // eslint-disable-next-line max-nested-callbacks
            const uploadKey = await uploadViaTus(item.file, (pct) =>
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, progress: pct } : i)),
            );

            const hasUploadError = uploadKey === null;
            if (hasUploadError) {
                errorCount++;
                setBatchItems(prev => prev.map(i => i.id === item.id ? { ...i, status: 'error' } : i));
                return;
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
                doneCount++;
                addVideo(result.data);
                setPollingVuids(prev => [...prev, toVuid(result.data.id)]);
            } else {
                errorCount++;
            }

            setBatchItems(prev => prev.map(i =>
                i.id === item.id
                    ? { ...i, status: result.ok ? 'done' : 'error', progress: result.ok ? 100 : i.progress }
                    : i,
            ));
        }));

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
        handleModeChange(UploadMode.SINGLE);
    }

    function handleModeToBatch() {
        handleModeChange(UploadMode.BATCH);
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

    function handleModeChange(next: UploadMode) {
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
            <Button variant="primary" size="md" onClick={() => void runSingleUpload()} disabled={isBusy}>
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
            footer={mode === UploadMode.SINGLE ? footerSingle : footerBatch}
        >
            {/* Mode tabs */}
            <div role="tablist" className="upload-modal__tabs">
                <Button
                    variant="ghost"
                    size="sm"
                    role="tab"
                    aria-selected={mode === UploadMode.SINGLE}
                    className={cn('upload-modal__tab', mode === UploadMode.SINGLE && 'upload-modal__tab--active')}
                    onClick={handleModeToSingle}
                >
                    {t('video.upload_mode_single')}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    role="tab"
                    aria-selected={mode === UploadMode.BATCH}
                    className={cn('upload-modal__tab', mode === UploadMode.BATCH && 'upload-modal__tab--active')}
                    onClick={handleModeToBatch}
                >
                    {t('video.upload_mode_batch')}
                </Button>
            </div>

            {/* ── Single mode ── */}
            {mode === UploadMode.SINGLE && (
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
                            <UploadPreview
                                thumbnailPreviewUrl={form.thumbnailPreviewUrl}
                                videoObjectUrl={form.videoObjectUrl}
                            />
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
                                <span>{formatEta(progress.remaining)}</span>
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
            {mode === UploadMode.BATCH && (
                <div className="upload-modal__batch">
                    {/* Multi-file drop zone */}
                    <div
                        className={cn('upload-modal__batch-drop', batchDragging && 'upload-modal__batch-drop--dragging')}
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
                                <BatchItemRow
                                    key={item.id}
                                    item={item}
                                    onRemove={removeBatchItem}
                                    onTitleChange={updateBatchTitle}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
