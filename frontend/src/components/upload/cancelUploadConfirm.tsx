import { useTranslation } from 'react-i18next';
import { AlertTriangle } from '@components/icons/icons';
import { Button, Modal } from '@ui';

interface CancelUploadConfirmProps {
    isOpen: boolean
    onConfirm: () => void
    onCancel: () => void
}

/**
 * Confirmation dialog shown when the user tries to close the upload modal
 * (X button, Escape, backdrop click, or the footer Cancel button) while an
 * upload is in progress — mirrors the pattern used by `DeleteVideoModal`.
 */
export default function CancelUploadConfirm({ isOpen, onConfirm, onCancel }: CancelUploadConfirmProps) {
    const { t } = useTranslation();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={t('video.cancel_upload_confirm_title')}
            size="sm"
            footer={
                <div className="upload-modal__cancel-confirm-footer">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        {t('video.keep_uploading')}
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={onConfirm}
                        leftIcon={<AlertTriangle size={13} />}
                    >
                        {t('video.cancel_upload_confirm_action')}
                    </Button>
                </div>
            }
        >
            <p className="upload-modal__cancel-confirm-text">
                {t('video.cancel_upload_confirm_body')}
            </p>
        </Modal>
    );
}
