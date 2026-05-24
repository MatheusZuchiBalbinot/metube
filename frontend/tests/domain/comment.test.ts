import { describe, it, expect } from 'vitest';
import { domain } from '@domain';
import type { Comment, Cuid, User } from '@models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const cuid = (s: string) => s as unknown as Cuid;

function makeComment(overrides: Partial<Comment> = {}): Comment {
    return {
        id: cuid('c-1'),
        content: 'Hello',
        author: { uuid: 'u-1', name: 'Alice', avatar: '' },
        createdAt: '2024-01-01T00:00:00Z',
        isEdited: false,
        likesCount: 0,
        isLiked: false,
        replyCount: 0,
        ...overrides,
    };
}

function makeUser(uuid = 'u-1'): User {
    return {
        id: 1 as unknown as User['id'],
        uuid,
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: '2024-01-01T00:00:00Z',
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('domain.comment.isReply', () => {
    it('returns true when parentCuid is defined', () => {
        const c = makeComment({ parentCuid: cuid('c-parent') });
        expect(domain.comment.isReply(c)).toBe(true);
    });

    it('returns false when parentCuid is undefined', () => {
        const c = makeComment({ parentCuid: undefined });
        expect(domain.comment.isReply(c)).toBe(false);
    });
});

describe('domain.comment.isOwnComment', () => {
    it('returns true when the author uuid matches the user uuid', () => {
        const c = makeComment({ author: { uuid: 'u-42', name: 'Alice', avatar: '' } });
        expect(domain.comment.isOwnComment(c, makeUser('u-42'))).toBe(true);
    });

    it('returns false when the author uuid does not match', () => {
        const c = makeComment({ author: { uuid: 'u-1', name: 'Alice', avatar: '' } });
        expect(domain.comment.isOwnComment(c, makeUser('u-99'))).toBe(false);
    });
});

describe('domain.comment.canEdit', () => {
    it('returns true for the comment author', () => {
        const c = makeComment({ author: { uuid: 'u-1', name: 'Alice', avatar: '' } });
        expect(domain.comment.canEdit(c, makeUser('u-1'))).toBe(true);
    });

    it('returns false for a different user', () => {
        const c = makeComment({ author: { uuid: 'u-1', name: 'Alice', avatar: '' } });
        expect(domain.comment.canEdit(c, makeUser('u-2'))).toBe(false);
    });
});

describe('domain.comment.canDelete', () => {
    it('returns true for the comment author', () => {
        const c = makeComment({ author: { uuid: 'u-1', name: 'Alice', avatar: '' } });
        expect(domain.comment.canDelete(c, makeUser('u-1'), 'ch-other')).toBe(true);
    });

    it('returns true for the video owner even if not the comment author', () => {
        const c = makeComment({ author: { uuid: 'u-author', name: 'Bob', avatar: '' } });
        expect(domain.comment.canDelete(c, makeUser('u-owner'), 'u-owner')).toBe(true);
    });

    it('returns false for an unrelated user', () => {
        const c = makeComment({ author: { uuid: 'u-1', name: 'Alice', avatar: '' } });
        expect(domain.comment.canDelete(c, makeUser('u-stranger'), 'u-owner')).toBe(false);
    });

    it('returns true when the same user is both comment author and video owner', () => {
        const c = makeComment({ author: { uuid: 'u-1', name: 'Alice', avatar: '' } });
        expect(domain.comment.canDelete(c, makeUser('u-1'), 'u-1')).toBe(true);
    });
});
