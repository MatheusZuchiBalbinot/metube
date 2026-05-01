export const ReactionType = {
    LIKE: 'like',
    DISLIKE: 'dislike',
} as const;
export type ReactionType = typeof ReactionType[keyof typeof ReactionType];
