import { useTranslation } from 'react-i18next';
import { Button, Modal } from '@ui';
import { cn } from '@utils';
import { UploadMode } from '@enums/uploadMode';
import { useVideoProcessingPoll } from '@hooks';
import './modal.css';
import { useUploadModal } from './useUploadModal';
import UploadSingleForm from './uploadSingleForm';
import UploadBatchZone from './uploadBatchZone';
import UploadFooter from './uploadFooter';
import CancelUploadConfirm from './cancelUploadConfirm';

export type { BatchItem } from './useUploadModal';

export default function UploadModal() {
    const { t } = useTranslation();

    const {
        uploadModalOpen,
        mode,
        handleModeToSingle,
        handleModeToBatch,
        form,
        titleShakeKey,
        pollingVuids,
        isUploading,
        isPaused,
        pauseUpload,
        resumeUpload,
        hasPreview,
        isBusy,
        progress,
        handleTitleChange,
        handleDescriptionChange,
        handleTagsChange,
        handleThumbnailFile,
        clearThumbnail,
        handleVideoFile,
        clearVideoFile,
        handleSingleSubmit,
        runSingleUpload,
        batchItems,
        isBatchUploading,
        batchDragging,
        batchPending,
        batchHasItems,
        batchInputRef,
        removeBatchItem,
        retryBatchItem,
        updateBatchTitle,
        handleBatchDrop,
        handleBatchDragOver,
        handleBatchDragLeave,
        handleBatchZoneClick,
        handleBatchInputChange,
        handleBatchUpload,
        handleClose,
        cancelConfirmOpen,
        confirmCancelUpload,
        dismissCancelConfirm,
        existingTags,
    } = useUploadModal();

    useVideoProcessingPoll(pollingVuids);

    const footer = (
        <UploadFooter
            mode={mode}
            isBusy={isBusy}
            isUploading={isUploading}
            isBatchUploading={isBatchUploading}
            batchPendingCount={batchPending.length}
            onClose={handleClose}
            onSingleSubmit={() => void runSingleUpload()}
            onBatchUpload={handleBatchUpload}
        />
    );

    return (
        <>
            <Modal
                isOpen={uploadModalOpen}
                onClose={handleClose}
                title={t('video.upload')}
                size="lg"
                footer={footer}
            >
                <div role="tablist" className="upload-modal__tabs">
                    <Button
                        variant="ghost"
                        size="sm"
                        role="tab"
                        aria-selected={mode === UploadMode.SINGLE}
                        className={cn('upload-modal__tab', mode === UploadMode.SINGLE && 'upload-modal__tab--active')}
                        onClick={handleModeToSingle}
                    >
                        {t('video.upload_mode_single')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        role="tab"
                        aria-selected={mode === UploadMode.BATCH}
                        className={cn('upload-modal__tab', mode === UploadMode.BATCH && 'upload-modal__tab--active')}
                        onClick={handleModeToBatch}
                    >
                        {t('video.upload_mode_batch')}
                    </Button>
                </div>

                {mode === UploadMode.SINGLE && (
                    <UploadSingleForm
                        form={form}
                        titleShakeKey={titleShakeKey}
                        isUploading={isUploading}
                        isPaused={isPaused}
                        onPauseUpload={pauseUpload}
                        onResumeUpload={resumeUpload}
                        hasPreview={hasPreview}
                        progress={progress}
                        onSubmit={handleSingleSubmit}
                        onTitleChange={handleTitleChange}
                        onDescriptionChange={handleDescriptionChange}
                        onTagsChange={handleTagsChange}
                        onThumbnailFile={handleThumbnailFile}
                        onClearThumbnail={clearThumbnail}
                        onVideoFile={handleVideoFile}
                        onClearVideoFile={clearVideoFile}
                        existingTags={existingTags}
                    />
                )}

                {mode === UploadMode.BATCH && (
                    <UploadBatchZone
                        batchItems={batchItems}
                        batchHasItems={batchHasItems}
                        batchDragging={batchDragging}
                        batchInputRef={batchInputRef}
                        onDrop={handleBatchDrop}
                        onDragOver={handleBatchDragOver}
                        onDragLeave={handleBatchDragLeave}
                        onZoneClick={handleBatchZoneClick}
                        onInputChange={handleBatchInputChange}
                        onRemoveItem={removeBatchItem}
                        onRetryItem={retryBatchItem}
                        onTitleChange={updateBatchTitle}
                    />
                )}
            </Modal>

            <CancelUploadConfirm
                isOpen={cancelConfirmOpen}
                onConfirm={confirmCancelUpload}
                onCancel={dismissCancelConfirm}
            />
        </>
    );
}
