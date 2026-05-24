import type { Comment, User } from '@models';

function isReply(c: Comment): boolean {
    return c.parentCuid !== undefined;
}

function isOwnComment(c: Comment, user: User): boolean {
    return c.author.uuid === user.uuid;
}

function canEdit(c: Comment, user: User): boolean {
    return isOwnComment(c, user);
}

function canDelete(c: Comment, user: User, videoChannelId: string): boolean {
    const isAuthor = isOwnComment(c, user);
    const isVideoOwner = videoChannelId === user.uuid;

    return isAuthor || isVideoOwner;
}

export const comment = { isReply, isOwnComment, canEdit, canDelete };
