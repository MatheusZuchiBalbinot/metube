import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button, Modal } from '@ui';
import type { Video } from '@models';

interface DeleteVideoModalProps {
    videoToDelete: Video | null
    onConfirm: () => void
    onCancel: () => void
}

export default function DeleteVideoModal({ videoToDelete, onConfirm, onCancel }: DeleteVideoModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            isOpen={videoToDelete !== null}
            onClose={onCancel}
            title={t('video.delete')}
            size="sm"
            footer={
                <div className="profile-page__edit-footer">
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={onConfirm}
                        leftIcon={<Trash2 size={13} />}
                    >
                        {t('video.delete')}
                    </Button>
                </div>
            }
        >
            <p className="profile-page__delete-confirm-text">
                {t('profile.delete_confirm', {
                    title: videoToDelete?.title ?? '',
                    defaultValue: 'Delete \'{{title}}\'? This cannot be undone.',
                })}
            </p>
        </Modal>
    );
}
