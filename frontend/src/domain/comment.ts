import type { Comment } from '@models/comment';
import type { User } from '@models/user';
import type { Video } from '@models/video';

function isReply(c: Comment): boolean {
    return c.parentCuid !== undefined;
}

function isOwnComment(c: Comment, user: User): boolean {
    return c.author.uuid === user.uuid;
}

function canEdit(c: Comment, user: User): boolean {
    return isOwnComment(c, user);
}

function canDelete(c: Comment, user: User, video: Video): boolean {
    const isAuthor = isOwnComment(c, user);
    const isVideoOwner = (video.channelId as string) === user.uuid;

    return isAuthor || isVideoOwner;
}

export const comment = { isReply, isOwnComment, canEdit, canDelete };
