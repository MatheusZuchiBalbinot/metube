import { CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '@ui';
import type { BatchItem } from './modal';

interface BatchItemRowProps {
    item: BatchItem
    onRemove: (id: string) => void
    onTitleChange: (id: string, title: string) => void
}

export default function BatchItemRow({ item, onRemove, onTitleChange }: BatchItemRowProps) {
    const { t } = useTranslation();

    return (
        <div className={`upload-modal__batch-item upload-modal__batch-item--${item.status}`}>
            <div className="upload-modal__batch-item-body">
                <Input
                    className="upload-modal__batch-title"
                    value={item.title}
                    onChange={e => onTitleChange(item.id, e.target.value)}
                    disabled={item.status !== 'pending'}
                    placeholder={t('video.upload_title')}
                />
                <span className="upload-modal__batch-filename">{item.file.name}</span>
                {item.status === 'uploading' && (
                    <div className="upload-modal__batch-progress">
                        <div
                            className="upload-modal__batch-progress-fill"
                            style={{ width: `${item.progress}%` }}
                        />
                    </div>
                )}
            </div>
            <div className="upload-modal__batch-item-side">
                {item.status === 'pending' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="upload-modal__batch-remove"
                        onClick={() => onRemove(item.id)}
                        aria-label={t('video.batch_remove')}
                    >
                        <Trash2 size={13} />
                    </Button>
                )}
                {item.status === 'uploading' && (
                    <span className="upload-modal__batch-pct">{Math.round(item.progress)}%</span>
                )}
                {item.status === 'done' && (
                    <CheckCircle2 size={16} className="upload-modal__batch-done" />
                )}
                {item.status === 'error' && (
                    <AlertCircle size={16} className="upload-modal__batch-error" />
                )}
            </div>
        </div>
    );
}
