const VIDEO_MIME_TYPES = new Set([
    'video/mp4', 'video/webm', 'video/ogg',
    'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
]);

const IMAGE_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/gif',
    'image/webp', 'image/svg+xml',
]);

export function isVideoFile(file: File): boolean {
    return VIDEO_MIME_TYPES.has(file.type);
}

export function isImageFile(file: File): boolean {
    return IMAGE_MIME_TYPES.has(file.type);
}

export function exceedsMaxSize(file: File, maxMB: number): boolean {
    return file.size > maxMB * 1_048_576;
}

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}
