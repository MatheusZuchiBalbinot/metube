import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@context/useAuth';
import { useVideo } from '@context/useVideo';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { Button, DragAndDrop, Input, Modal } from '@ui';
import { VideoStatus } from '@data/mockVideos';
import TagInput from '@components/tag/input';
import DatePicker from '@ui/date/picker';
import Badge from '@ui/badge/badge';
import './modal.css';

interface FormState {
    title: string
    description: string
    tags: string[]
    thumbnailBase64: string | null
    videoObjectUrl: string | null
    publishAt: string | null
    titleError: string | null
}

const INITIAL_FORM: FormState = {
    title: '',
    description: '',
    tags: [],
    thumbnailBase64: null,
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
    const { user } = useAuth();
    const dispatch = useAppDispatch();
    const { uploadModalOpen, closeUploadModal, addVideo } = useVideo();
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [titleShakeKey, setTitleShakeKey] = useState(0);
    const videoUrlRef = useRef<string | null>(null);

    const previewStatus = computeStatus(form.publishAt);
    const isScheduled = previewStatus === VideoStatus.SCHEDULED;

    function handleThumbnailFile(file: File) {
        const reader = new FileReader();
        reader.onload = ev => {
            const base64 = ev.target?.result as string;
            setForm(prev => ({ ...prev, thumbnailBase64: base64 }));
        };

        reader.readAsDataURL(file);
    }

    function clearThumbnail() {
        setForm(prev => ({ ...prev, thumbnailBase64: null }));
    }

    function handleVideoFile(file: File) {
        const hasPreviousUrl = videoUrlRef.current !== null;
        if (hasPreviousUrl) {
            URL.revokeObjectURL(videoUrlRef.current!);
        }

        const objectUrl = URL.createObjectURL(file);
        videoUrlRef.current = objectUrl;

        setForm(prev => ({ ...prev, videoObjectUrl: objectUrl }));
    }

    function clearVideoFile() {
        const hasPreviousUrl = videoUrlRef.current !== null;
        if (hasPreviousUrl) {
            URL.revokeObjectURL(videoUrlRef.current!);
            videoUrlRef.current = null;
        }

        setForm(prev => ({ ...prev, videoObjectUrl: null }));
    }

    function resetForm() {
        const hasPreviousUrl = videoUrlRef.current !== null;
        if (hasPreviousUrl) {
            URL.revokeObjectURL(videoUrlRef.current!);
            videoUrlRef.current = null;
        }

        setForm(INITIAL_FORM);
    }

    function handleClose() {
        closeUploadModal();
        resetForm();
    }

    // eslint-disable-next-line complexity
    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        const isTitleEmpty = form.title.trim() === '';
        if (isTitleEmpty) {
            setForm(prev => ({ ...prev, titleError: t('video.title_required') }));
            setTitleShakeKey(k => k + 1);
            return;
        }

        const status = computeStatus(form.publishAt);
        const isScheduledStatus = status === VideoStatus.SCHEDULED;

        const getPublishedAt = (): string => {
            if (isScheduledStatus) {
                return new Date().toISOString();
            }

            if (form.publishAt !== null) {
                return new Date(`${form.publishAt}T00:00:00`).toISOString();
            }
            return new Date().toISOString();
        };
        const publishedAt = getPublishedAt();

        const scheduledAt = isScheduledStatus
            ? new Date(`${form.publishAt!}T00:00:00`).toISOString()
            : undefined;

        const thumbnail = form.thumbnailBase64 !== null
            ? form.thumbnailBase64
            : `https://picsum.photos/seed/${crypto.randomUUID()}/320/180`;

        addVideo({
            title: form.title.trim(),
            description: form.description.trim(),
            tags: form.tags,
            thumbnail,
            publishedAt,
            scheduledAt,
            channel: user?.name ?? 'Eu',
            channelId: String(user?.id ?? 'me'),
            status,
            videoUrl: form.videoObjectUrl ?? undefined,
        });

        dispatch(toastActions.addToast({ message: t('toast.video_uploaded'), type: 'success' }));
        handleClose();
    }

    return (
        <Modal
            isOpen={uploadModalOpen}
            onClose={handleClose}
            title={t('video.upload')}
            size="lg"
            footer={
                <div className="upload-modal__footer">
                    <Button variant="ghost" size="md" onClick={handleClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="primary" size="md" onClick={handleSubmit}>
                        {t('video.upload_submit')}
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
                        {form.thumbnailBase64 !== null && (
                            <img
                                className="upload-modal__thumb-preview"
                                src={form.thumbnailBase64}
                                alt={t('video.upload_thumbnail')}
                            />
                        )}
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
