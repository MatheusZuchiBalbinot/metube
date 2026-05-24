import { useTranslation } from 'react-i18next';

interface UploadPreviewProps {
    thumbnailPreviewUrl: string | null
    videoObjectUrl: string | null
}

export default function UploadPreview({ thumbnailPreviewUrl, videoObjectUrl }: UploadPreviewProps) {
    const { t } = useTranslation();

    return (
        <div className="upload-modal__preview-strip">
            {thumbnailPreviewUrl !== null && (
                <div className="upload-modal__preview-item">
                    <span className="upload-modal__preview-caption">
                        {t('video.upload_thumbnail')}
                    </span>
                    <img
                        className="upload-modal__preview-media"
                        src={thumbnailPreviewUrl}
                        alt={t('video.upload_thumbnail')}
                    />
                </div>
            )}
            {videoObjectUrl !== null && (
                <div className="upload-modal__preview-item">
                    <span className="upload-modal__preview-caption">
                        {t('video.upload_video_file')}
                    </span>
                    <video
                        className="upload-modal__preview-media"
                        src={videoObjectUrl}
                        controls
                        muted
                        preload="metadata"
                    />
                </div>
            )}
        </div>
    );
}
