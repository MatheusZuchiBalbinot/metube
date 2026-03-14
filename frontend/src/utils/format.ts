export class Format {
    static views(views: number): string {
        const isMillion = views >= 1_000_000;
        if (isMillion) {
            return `${(views / 1_000_000).toFixed(1)}M`;
        }

        const isThousand = views >= 1_000;
        if (isThousand) {
            return `${(views / 1_000).toFixed(1)}K`;
        }

        return String(views);
    }

    static relativeDate(isoDate: string, locale = 'en'): string {
        const diffMs = Date.now() - new Date(isoDate).getTime();
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
}
