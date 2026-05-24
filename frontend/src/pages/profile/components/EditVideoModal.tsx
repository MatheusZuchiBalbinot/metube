import { useTranslation } from 'react-i18next';
import { Button, Input, Modal } from '@ui';
import TagInput from '@components/tag/input';
import type { Video, Tag } from '@models';

interface EditVideoModalProps {
    editingVideo: Video | null
    editTitle: string
    editDescription: string
    editTags: Tag[]
    onTitleChange: (value: string) => void
    onDescriptionChange: (value: string) => void
    onTagsChange: (tags: Tag[]) => void
    onSubmit: (e: React.FormEvent) => void
    onClose: () => void
}

export default function EditVideoModal({
    editingVideo, editTitle, editDescription, editTags,
    onTitleChange, onDescriptionChange, onTagsChange, onSubmit, onClose,
}: EditVideoModalProps) {
    const { t } = useTranslation();

    return (
        <Modal
            isOpen={editingVideo !== null}
            onClose={onClose}
            title={t('video.edit_video')}
            size="md"
        >
            <form className="profile-page__edit-form" onSubmit={onSubmit}>
                <Input
                    label={t('video.upload_title')}
                    value={editTitle}
                    onChange={e => onTitleChange(e.target.value)}
                    placeholder={t('video.upload_title')}
                />
                <div className="profile-page__edit-field">
                    <label className="profile-page__edit-label">{t('video.upload_description')}</label>
                    <textarea
                        className="profile-page__edit-textarea"
                        value={editDescription}
                        onChange={e => onDescriptionChange(e.target.value)}
                        rows={4}
                    />
                </div>
                <div className="profile-page__edit-field">
                    <label className="profile-page__edit-label">{t('video.upload_tags')}</label>
                    <TagInput value={editTags} onChange={onTagsChange} />
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
