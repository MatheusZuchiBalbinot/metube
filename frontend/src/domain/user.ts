import type { User } from '@models';

function isVerified(u: User): boolean {
    return u.emailVerifiedAt !== undefined;
}

function hasAvatar(u: User): boolean {
    return u.avatar !== undefined && u.avatar !== '';
}

export const user = { isVerified, hasAvatar };
