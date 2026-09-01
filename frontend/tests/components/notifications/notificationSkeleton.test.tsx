// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import NotificationSkeleton from '@components/notifications/notificationSkeleton';

describe('NotificationSkeleton', () => {
    it('renders an avatar placeholder and two text placeholders', () => {
        const { container } = render(<NotificationSkeleton />);

        expect(container.querySelector('.notification-skeleton')).toBeInTheDocument();
        expect(container.querySelector('.notification-skeleton__avatar')).toHaveClass('skeleton--circle');
        expect(container.querySelector('.notification-skeleton__title')).toBeInTheDocument();
        expect(container.querySelector('.notification-skeleton__text')).toBeInTheDocument();
    });
});
