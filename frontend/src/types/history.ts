export const HistoryPeriod = {
    TODAY: 'today',
    WEEK: 'week',
    MONTH: 'month',
    ALL: 'all',
} as const;
export type HistoryPeriod = typeof HistoryPeriod[keyof typeof HistoryPeriod];
