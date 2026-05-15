import type { SkipDirection } from '@enums/skipDirection';
import type { PopIconType } from '@enums/popIconType';

export type { SkipDirection } from '@enums/skipDirection';
export type { PopIconType } from '@enums/popIconType';

export type SkipIndicator = {
    dir: SkipDirection;
    count: number;
    key: number;
};

export type PopIcon = {
    type: PopIconType;
    key: number;
};

export const KEYBOARD_SKIP_SECONDS = 5 as const;
