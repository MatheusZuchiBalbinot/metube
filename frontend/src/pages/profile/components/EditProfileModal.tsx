import { useTranslation } from 'react-i18next';
import { Button, Input, Modal } from '@ui';

interface EditProfileModalProps {
    isOpen: boolean
    editName: string
    editBio: string
    onNameChange: (value: string) => void
    onBioChange: (value: string) => void
    onSubmit: (e: React.FormEvent) => void
    onClose: () => void
}

export default function EditProfileModal({
    isOpen, editName, editBio, onNameChange, onBioChange, onSubmit, onClose,
}: EditProfileModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t('profile.edit_profile')}
            size="sm"
        >
            <form className="profile-page__edit-form" onSubmit={onSubmit}>
                <Input
                    label={t('profile.name_label')}
                    value={editName}
                    onChange={e => onNameChange(e.target.value)}
                    placeholder={t('profile.name_label')}
                />
                <div className="profile-page__edit-field">
                    <label className="profile-page__edit-label">{t('profile.bio_label')}</label>
                    <textarea
                        className="profile-page__edit-textarea"
                        value={editBio}
                        onChange={e => onBioChange(e.target.value)}
                        rows={3}
                        placeholder={t('profile.bio_placeholder')}
                    />
                </div>
                <div className="profile-page__edit-footer">
                    <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" size="sm">
                        {t('common.save')}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
