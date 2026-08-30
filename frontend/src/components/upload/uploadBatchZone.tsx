import { useTranslation } from 'react-i18next';
import { cn, VIDEO_MIME_TYPES } from '@utils';
import BatchItemRow from './batchItemRow';
import type { BatchItem } from './useUploadModal';

interface UploadBatchZoneProps {
    batchItems: BatchItem[]
    batchHasItems: boolean
    batchDragging: boolean
    batchInputRef: React.RefObject<HTMLInputElement | null>
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void
    onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
    onDragLeave: () => void
    onZoneClick: () => void
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onRemoveItem: (id: string) => void
    onTitleChange: (id: string, title: string) => void
}

export default function UploadBatchZone({
    batchItems,
    batchHasItems,
    batchDragging,
    batchInputRef,
    onDrop,
    onDragOver,
    onDragLeave,
    onZoneClick,
    onInputChange,
    onRemoveItem,
    onTitleChange,
}: UploadBatchZoneProps) {
    const { t } = useTranslation();

    return (
        <div className="upload-modal__batch">
            {/* Drop zone is a mouse/drag convenience; the keyboard-accessible control is the overlaid
                focusable <input type="file"> below (.dnd-input: opacity:0, inset:0). */}
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
            <div
                className={cn('upload-modal__batch-drop', batchDragging && 'upload-modal__batch-drop--dragging')}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={onZoneClick}
            >
                <input
                    ref={batchInputRef}
                    type="file"
                    accept={VIDEO_MIME_TYPES.join(',')}
                    multiple
                    className="dnd-input"
                    onChange={onInputChange}
                />
                <p className="upload-modal__batch-drop-label">{t('video.batch_drop')}</p>
                <p className="upload-modal__batch-drop-sub">{t('video.batch_drop_sub')}</p>
            </div>

            {batchHasItems && (
                <div className="upload-modal__batch-list">
                    {batchItems.map(item => (
                        <BatchItemRow
                            key={item.id}
                            item={item}
                            onRemove={onRemoveItem}
                            onTitleChange={onTitleChange}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
