export const HistoryItemKind = {
    HEADER: 'header',
    VIDEO: 'video',
} as const;
export type HistoryItemKind = typeof HistoryItemKind[keyof typeof HistoryItemKind];
