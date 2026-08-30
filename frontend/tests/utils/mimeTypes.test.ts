import { describe, it, expect } from 'vitest';
import { VIDEO_MIME_TYPES, IMAGE_MIME_TYPES } from '@utils/mimeTypes';

describe('mimeTypes', () => {
    it('lists video MIME types with the video/ prefix', () => {
        expect(VIDEO_MIME_TYPES.length).toBeGreaterThan(0);
        expect(VIDEO_MIME_TYPES.every(m => m.startsWith('video/'))).toBe(true);
    });

    it('lists image MIME types with the image/ prefix', () => {
        expect(IMAGE_MIME_TYPES.length).toBeGreaterThan(0);
        expect(IMAGE_MIME_TYPES.every(m => m.startsWith('image/'))).toBe(true);
    });
});
