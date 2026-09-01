import { useTranslation } from 'react-i18next';
import { Button } from '@ui';
import { UploadMode } from '@enums/uploadMode';

interface UploadFooterProps {
    mode: UploadMode
    isBusy: boolean
    isUploading: boolean
    isBatchUploading: boolean
    batchPendingCount: number
    onClose: () => void
    onSingleSubmit: () => void
    onBatchUpload: () => Promise<void>
}

export default function UploadFooter({
    mode,
    isBusy,
    isUploading,
    isBatchUploading,
    batchPendingCount,
    onClose,
    onSingleSubmit,
    onBatchUpload,
}: UploadFooterProps) {
    const { t } = useTranslation();

    const isSingle = mode === UploadMode.SINGLE;

    return (
        <div className="upload-modal__footer">
            {/* Enabled even while an upload is in flight — `onClose` (handleClose) routes
                through a confirm dialog in that case instead of being a no-op, so the user
                always has a way out of the modal. */}
            <Button variant="ghost" size="md" onClick={onClose}>
                {t('common.cancel')}
            </Button>

            {isSingle && (
                <Button variant="primary" size="md" onClick={onSingleSubmit} disabled={isBusy}>
                    {isUploading ? t('video.uploading') : t('video.upload_submit')}
                </Button>
            )}

            {!isSingle && (
                <Button
                    variant="primary"
                    size="md"
                    onClick={() => void onBatchUpload()}
                    disabled={isBatchUploading || batchPendingCount === 0}
                >
                    {isBatchUploading
                        ? t('video.uploading')
                        : t('video.batch_upload_submit', { count: batchPendingCount })}
                </Button>
            )}
        </div>
    );
}
