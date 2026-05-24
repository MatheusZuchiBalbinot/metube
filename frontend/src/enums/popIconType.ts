export const PopIconType = {
    PLAY: 'play',
    PAUSE: 'pause',
} as const;

export type PopIconType = typeof PopIconType[keyof typeof PopIconType];
