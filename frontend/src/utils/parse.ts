import type { Tag } from '@models/tag';

export function parseTags(raw: string | null): Tag[] {
    const isEmpty = !raw || raw.trim() === '';

    if (isEmpty) {
        return [];
    }
    return raw.split(',')
        .map(t => t.trim())
        .filter(Boolean)
        .map(t => t as Tag);
}

export function parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':').map(Number);
    const isInvalid = parts.some(isNaN);

    if (isInvalid) {
        return 0;
    }

    if (parts.length === 3) {
        const [h, m, s] = parts;
        return h * 3600 + m * 60 + s;
    }

    if (parts.length === 2) {
        const [m, s] = parts;
        return m * 60 + s;
    }

    return 0;
}

export function secondsToTimestamp(seconds: number): string {
    const total = Math.floor(Math.max(0, seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (h > 0) {
        return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${m}:${pad(s)}`;
}

export function fileExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    const hasExtension = dotIndex >= 0 && dotIndex < filename.length - 1;
    if (!hasExtension) {
        return '';
    }
    return filename.slice(dotIndex + 1).toLowerCase();
}

export function isUuid(value: string): boolean {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return UUID_REGEX.test(value);
}
