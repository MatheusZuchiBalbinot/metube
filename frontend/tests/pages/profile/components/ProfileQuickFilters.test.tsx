// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileQuickFilters from '@pages/profile/components/ProfileQuickFilters';
import { renderWithProviders } from '../../../helpers/renderWithProviders';
import { VideoFilter, SortBy } from '@utils';
import type { Tag } from '@models';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

describe('ProfileQuickFilters', () => {
    it('always shows which sort order is currently active', () => {
        renderWithProviders(
            <ProfileQuickFilters value={VideoFilter.emptyState()} onChange={vi.fn()} />,
        );

        expect(screen.getByRole('button', { name: 'video.sort_recent' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByRole('button', { name: 'video.sort_views' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('changing sort preserves an active tag filter instead of resetting it', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const value = { ...VideoFilter.emptyState(), tags: ['meta' as Tag] };

        renderWithProviders(<ProfileQuickFilters value={value} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: 'video.sort_views' }));

        expect(onChange).toHaveBeenCalledWith({ ...value, sortBy: SortBy.VIEWS });
    });

    it('disables and un-highlights sort while the topic view is active', () => {
        renderWithProviders(
            <ProfileQuickFilters value={VideoFilter.emptyState()} onChange={vi.fn()} isTopicViewActive />,
        );

        const recentBtn = screen.getByRole('button', { name: 'video.sort_recent' });
        expect(recentBtn).toBeDisabled();
        expect(recentBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('scrolls to the trending section when Views sort is picked', async () => {
        const user = userEvent.setup();
        const onScrollToTrending = vi.fn();

        renderWithProviders(
            <ProfileQuickFilters
                value={VideoFilter.emptyState()}
                onChange={vi.fn()}
                onScrollToTrending={onScrollToTrending}
            />,
        );

        await user.click(screen.getByRole('button', { name: 'video.sort_views' }));
        expect(onScrollToTrending).toHaveBeenCalled();
    });

    it('highlights the topic toggle and calls back when clicked', async () => {
        const user = userEvent.setup();
        const onToggleTopicView = vi.fn();

        renderWithProviders(
            <ProfileQuickFilters
                value={VideoFilter.emptyState()}
                onChange={vi.fn()}
                isTopicViewActive
                onToggleTopicView={onToggleTopicView}
            />,
        );

        const toggle = screen.getByRole('button', { name: 'profile.filter_topic' });
        expect(toggle).toHaveAttribute('aria-pressed', 'true');

        await user.click(toggle);
        expect(onToggleTopicView).toHaveBeenCalled();
    });
});
