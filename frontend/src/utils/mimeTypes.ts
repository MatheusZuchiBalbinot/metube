/**
 * Frontend mirror of the MIME type lists in backend/app/Config/UploadLimits.php
 * — kept in sync by hand. Client-side use here is only a UX convenience (a
 * narrower OS file picker via an <input accept> string); the backend
 * re-validates content-type regardless, since none of this is trustworthy
 * once it leaves the browser.
 */

export const VIDEO_MIME_TYPES = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'video/x-msvideo',
    'video/avi',
] as const;

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
