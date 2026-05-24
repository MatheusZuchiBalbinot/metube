import type { Video } from '@models/video';
import { VideoStatus } from '@models/video';
import type { User } from '@models/user';

function isPublished(v: Video): boolean {
    return v.status === VideoStatus.PUBLISHED;
}

function isProcessing(v: Video): boolean {
    return v.status === VideoStatus.PROCESSING;
}

function isFailed(v: Video): boolean {
    return v.status === VideoStatus.FAILED;
}

function isScheduled(v: Video): boolean {
    return v.status === VideoStatus.SCHEDULED;
}

function isDraft(v: Video): boolean {
    return v.status === VideoStatus.DRAFT;
}

function isScheduledAndFuture(v: Video): boolean {
    const hasScheduledAt = v.scheduledAt !== undefined;
    return isScheduled(v) && hasScheduledAt && new Date(v.scheduledAt!) > new Date();
}

function isScheduledInPast(v: Video): boolean {
    const hasScheduledAt = v.scheduledAt !== undefined;
    if (!isScheduled(v) || !hasScheduledAt) {
        return false;
    }

    return new Date(v.scheduledAt!) <= new Date();
}

/** Published, or scheduled with a past publish date */
function isVisible(v: Video): boolean {
    return isPublished(v) || isScheduledInPast(v);
}

/** Can be liked, commented on, etc. — not still processing or failed */
function isInteractable(v: Video): boolean {
    return !isProcessing(v) && !isFailed(v);
}

function isOwnedBy(v: Video, user: User): boolean {
    return (v.channelId as string) === user.uuid;
}

export { isPublished, isProcessing, isFailed, isScheduled, isScheduledAndFuture, isDraft, isScheduledInPast, isVisible, isInteractable, isOwnedBy };

export const video = {
    isPublished,
    isProcessing,
    isFailed,
    isScheduled,
    isScheduledAndFuture,
    isDraft,
    isScheduledInPast,
    isVisible,
    isInteractable,
    isOwnedBy,
};
