export const SuggestionKind = {
    VIDEO: 'video',
    CHANNEL: 'channel',
    TAG: 'tag',
} as const;
export type SuggestionKind = typeof SuggestionKind[keyof typeof SuggestionKind];
