export const BarState = {
    IDLE: 'idle',
    LOADING: 'loading',
    DONE: 'done',
} as const;

export type BarState = typeof BarState[keyof typeof BarState];
