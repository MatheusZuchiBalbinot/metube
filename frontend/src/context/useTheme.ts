import { useAppDispatch, useAppSelector } from '@store';
import { themeActions } from '@store/themeSlice';
import type { ThemeMode, ThemeColor } from '@utils/themes';

export type { ThemeMode, ThemeColor };

export function useTheme() {
    const dispatch = useAppDispatch();
    const { mode, color } = useAppSelector(s => s.theme);

    return {
        mode,
        color,
        setMode: (next: ThemeMode) => dispatch(themeActions.setMode(next)),
        setColor: (next: ThemeColor) => dispatch(themeActions.setColor(next)),
    };
}
