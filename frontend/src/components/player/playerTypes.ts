import type { SkipDirection } from '@enums/skipDirection';
import type { PopIconType } from '@enums/popIconType';
import type { Size } from '@ui/types';

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

export type CaptionSize = Size;

export interface ShakaLevel {
    index: number;
    height: number;
    bitrate: number;
    label: string;
}

/** Which view the settings dropdown is showing: the root list, or a drilled-down submenu. */
export type SettingsPanel = 'root' | 'speed' | 'quality' | 'captionSize';

export type SettingsPanelDirection = 'forward' | 'back';
