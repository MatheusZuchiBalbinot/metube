import { describe, it, expect } from 'vitest';
import { domain } from '@domain';
import type { User } from '@models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
    return {
        id: 1 as unknown as User['id'],
        uuid: 'u-1',
        name: 'Alice',
        email: 'alice@example.com',
        createdAt: '2024-01-01T00:00:00Z',
        ...overrides,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('domain.user.isVerified', () => {
    it('returns true when emailVerifiedAt is defined', () => {
        const u = makeUser({ emailVerifiedAt: '2024-01-01T00:00:00Z' });
        expect(domain.user.isVerified(u)).toBe(true);
    });

    it('returns false when emailVerifiedAt is undefined', () => {
        const u = makeUser({ emailVerifiedAt: undefined });
        expect(domain.user.isVerified(u)).toBe(false);
    });
});

describe('domain.user.hasAvatar', () => {
    it('returns true when avatar is a non-empty string', () => {
        const u = makeUser({ avatar: 'https://cdn.example.com/avatar.png' });
        expect(domain.user.hasAvatar(u)).toBe(true);
    });

    it('returns false when avatar is undefined', () => {
        const u = makeUser({ avatar: undefined });
        expect(domain.user.hasAvatar(u)).toBe(false);
    });

    it('returns false when avatar is an empty string', () => {
        const u = makeUser({ avatar: '' });
        expect(domain.user.hasAvatar(u)).toBe(false);
    });
});
