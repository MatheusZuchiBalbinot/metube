import { useAppDispatch, useAppSelector } from '@store';
import { themeActions } from '@store/themeSlice';
import { selectTheme } from '@store/themeSelectors';
import type { ThemeMode, ThemeColor } from '@utils';

export type { ThemeMode, ThemeColor };

export function useTheme() {
    const dispatch = useAppDispatch();
    const { mode, color } = useAppSelector(selectTheme);

    function setMode(next: ThemeMode): void {
        dispatch(themeActions.setMode(next));
    }

    function setColor(next: ThemeColor): void {
        dispatch(themeActions.setColor(next));
    }

    return { mode, color, setMode, setColor };
}
