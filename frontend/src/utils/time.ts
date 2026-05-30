import { t } from 'i18next';
import type { Seconds } from '@models';

export function formatDuration(seconds: Seconds): string {
    const isInvalid = !Number.isFinite(seconds) || seconds < 0;

    if (isInvalid) {
        return '0:00';
    }

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const hasHours = hours > 0;

    if (hasHours) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatDurationCompact(seconds: Seconds): string {
    const isInvalid = !Number.isFinite(seconds) || seconds <= 0;

    if (isInvalid) {
        return '0m';
    }

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const hasHours = hours > 0;

    if (hasHours) {
        return `${hours}h ${minutes}m`;
    }

    const hasMinutes = minutes > 0;

    if (hasMinutes) {
        return `${minutes}m`;
    }

    return '<1m';
}

export function formatRelativeDate(isoDate: string | null | undefined, locale = 'en'): string {
    const dateToUse = isoDate ?? new Date().toISOString();
    const diffMs = Date.now() - new Date(dateToUse).getTime();
    const diffSec = Math.round(diffMs / 1_000);
    const diffMin = Math.round(diffSec / 60);
    const diffH = Math.round(diffMin / 60);
    const diffD = Math.round(diffH / 24);
    const diffW = Math.round(diffD / 7);
    const diffMo = Math.round(diffD / 30);
    const diffY = Math.round(diffD / 365);

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

    if (diffSec < 60) {
        return rtf.format(-diffSec, 'second');
    }

    if (diffMin < 60) {
        return rtf.format(-diffMin, 'minute');
    }

    if (diffH < 24) {
        return rtf.format(-diffH, 'hour');
    }

    if (diffD < 7) {
        return rtf.format(-diffD, 'day');
    }

    if (diffW < 5) {
        return rtf.format(-diffW, 'week');
    }

    if (diffMo < 12) {
        return rtf.format(-diffMo, 'month');
    }

    return rtf.format(-diffY, 'year');
}

export function formatEta(seconds: number): string {
    const isInvalid = seconds <= 0 || !Number.isFinite(seconds);

    if (isInvalid) {
        return '';
    }

    if (seconds < 60) {
        return t('time.seconds_left', { count: Math.ceil(seconds) });
    }

    if (seconds < 3600) {
        return t('time.minutes_left', { count: Math.ceil(seconds / 60) });
    }

    return t('time.hours_left', { count: Math.ceil(seconds / 3600) });
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

export function parseChapterTimestamp(ts: string): Seconds {
    const parts = ts.split(':').map(Number);
    const isHMS = parts.length === 3;
    const raw = isHMS
        ? parts[0] * 3600 + parts[1] * 60 + parts[2]
        : parts[0] * 60 + (parts[1] ?? 0);
    return raw as unknown as Seconds;
}
