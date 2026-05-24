import { describe, it, expect } from 'vitest';
import { domain } from '@domain';
import { VideoStatus, type Video } from '@models';
import type { ChannelId } from '@models';
import type { User } from '@models';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAST = '2020-01-01T00:00:00Z';
const FUTURE = '2099-01-01T00:00:00Z';

function makeVideo(overrides: Partial<Video> = {}): Video {
    return {
        id: 'v-1' as unknown as Video['id'],
        title: 'Test',
        description: '',
        tags: [],
        thumbnail: '',
        publishedAt: '2024-01-01T00:00:00Z',
        channel: 'Ch',
        channelId: 'ch-1' as ChannelId,
        views: 0,
        status: VideoStatus.PUBLISHED,
        createdAt: '2024-01-01T00:00:00Z',
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

describe('domain.video.isPublished', () => {
    it('returns true for PUBLISHED status', () => {
        expect(domain.video.isPublished(makeVideo({ status: VideoStatus.PUBLISHED }))).toBe(true);
    });

    it.each([VideoStatus.PROCESSING, VideoStatus.FAILED, VideoStatus.SCHEDULED, VideoStatus.DRAFT])(
        'returns false for %s status',
        (status) => {
            expect(domain.video.isPublished(makeVideo({ status }))).toBe(false);
        },
    );
});

describe('domain.video.isProcessing', () => {
    it('returns true for PROCESSING status', () => {
        expect(domain.video.isProcessing(makeVideo({ status: VideoStatus.PROCESSING }))).toBe(true);
    });

    it.each([VideoStatus.PUBLISHED, VideoStatus.FAILED, VideoStatus.SCHEDULED, VideoStatus.DRAFT])(
        'returns false for %s status',
        (status) => {
            expect(domain.video.isProcessing(makeVideo({ status }))).toBe(false);
        },
    );
});

describe('domain.video.isFailed', () => {
    it('returns true for FAILED status', () => {
        expect(domain.video.isFailed(makeVideo({ status: VideoStatus.FAILED }))).toBe(true);
    });

    it.each([VideoStatus.PUBLISHED, VideoStatus.PROCESSING, VideoStatus.SCHEDULED, VideoStatus.DRAFT])(
        'returns false for %s status',
        (status) => {
            expect(domain.video.isFailed(makeVideo({ status }))).toBe(false);
        },
    );
});

describe('domain.video.isScheduled', () => {
    it('returns true for SCHEDULED status', () => {
        expect(domain.video.isScheduled(makeVideo({ status: VideoStatus.SCHEDULED }))).toBe(true);
    });

    it.each([VideoStatus.PUBLISHED, VideoStatus.PROCESSING, VideoStatus.FAILED, VideoStatus.DRAFT])(
        'returns false for %s status',
        (status) => {
            expect(domain.video.isScheduled(makeVideo({ status }))).toBe(false);
        },
    );
});

describe('domain.video.isDraft', () => {
    it('returns true for DRAFT status', () => {
        expect(domain.video.isDraft(makeVideo({ status: VideoStatus.DRAFT }))).toBe(true);
    });

    it.each([VideoStatus.PUBLISHED, VideoStatus.PROCESSING, VideoStatus.FAILED, VideoStatus.SCHEDULED])(
        'returns false for %s status',
        (status) => {
            expect(domain.video.isDraft(makeVideo({ status }))).toBe(false);
        },
    );
});

describe('domain.video.isScheduledInPast', () => {
    it('returns true for SCHEDULED with past scheduledAt', () => {
        const v = makeVideo({ status: VideoStatus.SCHEDULED, scheduledAt: PAST });
        expect(domain.video.isScheduledInPast(v)).toBe(true);
    });

    it('returns false for SCHEDULED with future scheduledAt', () => {
        const v = makeVideo({ status: VideoStatus.SCHEDULED, scheduledAt: FUTURE });
        expect(domain.video.isScheduledInPast(v)).toBe(false);
    });

    it('returns false for SCHEDULED without scheduledAt', () => {
        const v = makeVideo({ status: VideoStatus.SCHEDULED, scheduledAt: undefined });
        expect(domain.video.isScheduledInPast(v)).toBe(false);
    });

    it('returns false for non-SCHEDULED status even with past scheduledAt', () => {
        const v = makeVideo({ status: VideoStatus.PUBLISHED, scheduledAt: PAST });
        expect(domain.video.isScheduledInPast(v)).toBe(false);
    });
});

describe('domain.video.isVisible', () => {
    it('returns true for PUBLISHED video', () => {
        expect(domain.video.isVisible(makeVideo({ status: VideoStatus.PUBLISHED }))).toBe(true);
    });

    it('returns true for SCHEDULED video with past scheduledAt', () => {
        const v = makeVideo({ status: VideoStatus.SCHEDULED, scheduledAt: PAST });
        expect(domain.video.isVisible(v)).toBe(true);
    });

    it('returns false for SCHEDULED video with future scheduledAt', () => {
        const v = makeVideo({ status: VideoStatus.SCHEDULED, scheduledAt: FUTURE });
        expect(domain.video.isVisible(v)).toBe(false);
    });

    it.each([VideoStatus.PROCESSING, VideoStatus.FAILED, VideoStatus.DRAFT])(
        'returns false for %s status',
        (status) => {
            expect(domain.video.isVisible(makeVideo({ status }))).toBe(false);
        },
    );
});

describe('domain.video.isInteractable', () => {
    it.each([VideoStatus.PROCESSING, VideoStatus.FAILED])(
        'returns false for %s status',
        (status) => {
            expect(domain.video.isInteractable(makeVideo({ status }))).toBe(false);
        },
    );

    it.each([VideoStatus.PUBLISHED, VideoStatus.SCHEDULED, VideoStatus.DRAFT])(
        'returns true for %s status',
        (status) => {
            expect(domain.video.isInteractable(makeVideo({ status }))).toBe(true);
        },
    );
});

describe('domain.video.isOwnedBy', () => {
    it('returns true when channelId matches user uuid', () => {
        const v = makeVideo({ channelId: 'u-42' as ChannelId });
        const u = makeUser('u-42');
        expect(domain.video.isOwnedBy(v, u)).toBe(true);
    });

    it('returns false when channelId does not match user uuid', () => {
        const v = makeVideo({ channelId: 'ch-other' as ChannelId });
        const u = makeUser('u-42');
        expect(domain.video.isOwnedBy(v, u)).toBe(false);
    });
});
