import { useTranslation } from 'react-i18next';
import { DragAndDrop, Input } from '@ui';
import { Format, formatEta } from '@utils';
import TagInput from '@components/tag/input';
import type { FormState } from './useUploadModal';
import type { UploadProgress } from '@utils';
import type { Tag } from '@models';
import UploadPreview from './uploadPreview';

interface UploadSingleFormProps {
    form: FormState
    titleShakeKey: number
    isUploading: boolean
    hasPreview: boolean
    progress: UploadProgress | null
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
    onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onDescriptionChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
    onTagsChange: (tags: Tag[]) => void
    onThumbnailFile: (file: File) => void
    onClearThumbnail: () => void
    onVideoFile: (file: File) => void
    onClearVideoFile: () => void
    existingTags: Tag[]
}

export default function UploadSingleForm({
    form,
    titleShakeKey,
    isUploading,
    hasPreview,
    progress,
    onSubmit,
    onTitleChange,
    onDescriptionChange,
    onTagsChange,
    onThumbnailFile,
    onClearThumbnail,
    onVideoFile,
    onClearVideoFile,
    existingTags,
}: UploadSingleFormProps) {
    const { t } = useTranslation();

    return (
        <form className="upload-modal__form" onSubmit={onSubmit}>
            <div key={titleShakeKey} className={titleShakeKey > 0 && form.titleError ? 'animate-shake' : ''}>
                <Input
                    id="um-title"
                    label={t('video.upload_title')}
                    placeholder={t('video.upload_title')}
                    value={form.title}
                    error={form.titleError ?? undefined}
                    onChange={onTitleChange}
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
                    onChange={onDescriptionChange}
                    disabled={isUploading}
                />
            </div>

            <div className="upload-modal__field">
                <label className="upload-modal__label">{t('video.upload_tags')}</label>
                <TagInput
                    value={form.tags}
                    onChange={onTagsChange}
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
                        onFileSelect={onThumbnailFile}
                        onClear={onClearThumbnail}
                    />
                </div>

                <div className="upload-modal__field">
                    <label className="upload-modal__label">{t('video.upload_video_file')}</label>
                    <DragAndDrop
                        accept="video/*"
                        maxSizeMB={2048}
                        label={t('video.drag_video')}
                        sublabel={t('video.drag_video_sub')}
                        onFileSelect={onVideoFile}
                        onClear={onClearVideoFile}
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
        </form>
    );
}
