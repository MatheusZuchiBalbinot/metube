export type SkipDirection = 'fwd' | 'bwd';

export type SkipIndicator = {
    dir: SkipDirection;
    count: number;
    key: number;
};

export type PopIcon = {
    type: 'play' | 'pause';
    key: number;
};

export const KEYBOARD_SKIP_SECONDS = 5 as const;
