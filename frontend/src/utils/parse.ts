import type { Tag } from '@models';

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
