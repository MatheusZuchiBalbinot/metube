export const QuickRangeKind = {
    LAST_7D: 'last7d',
    LAST_30D: 'last30d',
    LAST_90D: 'last90d',
    THIS_YEAR: 'thisYear',
} as const;
export type QuickRangeKind = typeof QuickRangeKind[keyof typeof QuickRangeKind];
