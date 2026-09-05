import { useTranslation } from 'react-i18next';
import { DragAndDrop, Input } from '@ui';
import { Format, formatEta, IMAGE_MIME_TYPES, VIDEO_MIME_TYPES, THUMBNAIL_MAX_SIZE_MB, VIDEO_MAX_SIZE_MB } from '@utils';
import { Play, Pause } from '@components/icons/icons';
import TagInput from '@components/tag/input';
import type { FormState } from './useUploadModal';
import type { UploadProgress } from '@utils';
import type { Tag } from '@models';
import UploadPreview from './uploadPreview';

// Extracted so the shake-class && + ternary doesn't count toward UploadSingleForm's
// own complexity — same class string as before.
function titleWrapperClassName(titleShakeKey: number, titleError: string | null): string {
    return titleShakeKey > 0 && titleError ? 'animate-shake' : '';
}

interface UploadProgressBarProps {
    progress: UploadProgress
    canTogglePause: boolean
    isPaused: boolean
    onPauseUpload?: () => void
    onResumeUpload?: () => void
}

function UploadProgressBar({ progress, canTogglePause, isPaused, onPauseUpload, onResumeUpload }: UploadProgressBarProps) {
    const { t } = useTranslation();

    return (
        <div className="upload-modal__progress">
            <div className="upload-modal__progress-bar">
                <div
                    className="upload-modal__progress-fill"
                    style={{ width: `${progress.percent}%` }}
                />
            </div>
            <div className="upload-modal__progress-info">
                {canTogglePause && (
                    <button
                        type="button"
                        onClick={isPaused ? onResumeUpload : onPauseUpload}
                        aria-label={isPaused ? t('video.upload_resume') : t('video.upload_pause')}
                        title={isPaused ? t('video.upload_resume') : t('video.upload_pause')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: 0,
                            border: 'none',
                            background: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                        }}
                    >
                        {isPaused ? <Play size={14} /> : <Pause size={14} />}
                    </button>
                )}
                <span>{Format.percent(progress.percent)}</span>
                <span>{Format.speed(progress.speed)}</span>
                <span>{formatEta(progress.remaining)}</span>
            </div>
        </div>
    );
}

interface UploadSingleFormProps {
    form: FormState
    titleShakeKey: number
    isUploading: boolean
    isPaused?: boolean
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
    onPauseUpload?: () => void
    onResumeUpload?: () => void
    existingTags: Tag[]
}

export default function UploadSingleForm({
    form,
    titleShakeKey,
    isUploading,
    isPaused = false,
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
    onPauseUpload,
    onResumeUpload,
    existingTags,
}: UploadSingleFormProps) {
    const { t } = useTranslation();
    const canTogglePause = onPauseUpload !== undefined && onResumeUpload !== undefined;

    return (
        <form className="upload-modal__form" onSubmit={onSubmit}>
            <div key={titleShakeKey} className={titleWrapperClassName(titleShakeKey, form.titleError)}>
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
                        accept={IMAGE_MIME_TYPES.join(',')}
                        maxSizeMB={THUMBNAIL_MAX_SIZE_MB}
                        label={t('video.drag_image')}
                        sublabel={t('video.drag_image_sub')}
                        onFileSelect={onThumbnailFile}
                        onClear={onClearThumbnail}
                    />
                </div>

                <div className="upload-modal__field">
                    <label className="upload-modal__label">{t('video.upload_video_file')}</label>
                    <DragAndDrop
                        accept={VIDEO_MIME_TYPES.join(',')}
                        maxSizeMB={VIDEO_MAX_SIZE_MB}
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
                <UploadProgressBar
                    progress={progress}
                    canTogglePause={canTogglePause}
                    isPaused={isPaused}
                    onPauseUpload={onPauseUpload}
                    onResumeUpload={onResumeUpload}
                />
            )}
        </form>
    );
}
