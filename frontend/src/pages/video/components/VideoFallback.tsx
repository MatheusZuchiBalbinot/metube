import { VideoOff, AlertTriangle, Trash2 } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@ui';

interface VideoFallbackProps {
    thumbnail: string | undefined
    title: string
    isFailed?: boolean
    isOwner?: boolean
    onDeleteAndReupload?: () => void
}

// Extracted so the isFailed ? ... : ... branches don't count toward VideoFallback's
// own complexity — purely a visual split, same icon/text output as before.
function FallbackIcon({ isFailed }: { isFailed: boolean }) {
    return isFailed ? (
        <AlertTriangle size={32} strokeWidth={1.5} />
    ) : (
        <VideoOff size={32} strokeWidth={1.5} />
    );
}

interface FallbackMessageProps {
    isFailed: boolean
    showDeleteAction: boolean
    onDeleteAndReupload?: () => void
}

function FallbackMessage({ isFailed, showDeleteAction, onDeleteAndReupload }: FallbackMessageProps) {
    const { t } = useTranslation();

    return (
        <>
            <p>{isFailed ? t('video.processing_failed') : t('video.no_video_file')}</p>
            {isFailed && <p>{t('video.processing_failed_desc')}</p>}
            {showDeleteAction && (
                <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    leftIcon={<Trash2 size={13} />}
                    onClick={onDeleteAndReupload}
                >
                    {t('video.delete_and_reupload')}
                </Button>
            )}
        </>
    );
}

export default function VideoFallback({ thumbnail, title, isFailed = false, isOwner = false, onDeleteAndReupload }: VideoFallbackProps) {
    const showDeleteAction = isFailed && isOwner && onDeleteAndReupload !== undefined;

    return (
        <div className="video-page__player">
            <div className="video-page__player-fallback">
                <img
                    src={thumbnail}
                    alt={title}
                    className="video-page__player-fallback-img"
                />
                <div className="video-page__player-fallback-msg">
                    <FallbackIcon isFailed={isFailed} />
                    <FallbackMessage
                        isFailed={isFailed}
                        showDeleteAction={showDeleteAction}
                        onDeleteAndReupload={onDeleteAndReupload}
                    />
                </div>
            </div>
        </div>
    );
}
