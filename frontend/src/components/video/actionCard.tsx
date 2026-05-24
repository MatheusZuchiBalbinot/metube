import type { Video, VideoId } from '@models/video';
import VideoCard from './card';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';

interface VideoActionCardProps {
    video: Video;
    index: number;
    actionIcon: React.ReactNode;
    actionLabel: string;
    itemClass: string;
    btnClass: string;
    onAction: (videoId: VideoId) => void;
}

export default function VideoActionCard({
    video, index, actionIcon, actionLabel, itemClass, btnClass, onAction,
}: VideoActionCardProps) {
    function handleAction() {
        onAction(video.id);
    }

    return (
        <div className={itemClass}>
            <VideoCard video={video} index={index} />
            <Tooltip content={actionLabel} side="top">
                <Button
                    variant="ghost"
                    size="icon"
                    className={btnClass}
                    onClick={handleAction}
                    aria-label={actionLabel}
                >
                    {actionIcon}
                </Button>
            </Tooltip>
        </div>
    );
}
