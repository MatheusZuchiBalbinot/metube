export const SkipDirection = {
    FWD: 'fwd',
    BWD: 'bwd',
} as const;

export type SkipDirection = typeof SkipDirection[keyof typeof SkipDirection];
