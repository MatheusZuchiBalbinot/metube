import { useVideoData } from './useVideoData';
import { useVideoActions } from './useVideoActions';
import { usePlaybackPrefs } from './usePlaybackPrefs';
import { useVideoUi, type TagView, type MiniPlayerState } from './useVideoUi';

export type { TagView, MiniPlayerState };

/**
 * Backwards-compatible façade over the focused hooks (`useVideoData`,
 * `useVideoActions`, `usePlaybackPrefs`, `useVideoUi`). Prefer the focused hooks
 * in new code so a component only subscribes to the state it actually reads —
 * this façade subscribes to all of it.
 */
export function useVideo() {
    return {
        ...useVideoData(),
        ...useVideoActions(),
        ...usePlaybackPrefs(),
        ...useVideoUi(),
    };
}
