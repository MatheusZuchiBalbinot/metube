// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import NavProgress from '@components/ui/navProgress/navProgress';

function Harness({ to }: { to: string }) {
    const navigate = useNavigate();
    React.useEffect(() => {
        navigate(to);
    }, [to, navigate]);
    return <NavProgress />;
}

describe('NavProgress', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders nothing on initial mount', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/']}>
                <NavProgress />
            </MemoryRouter>,
        );

        expect(container.querySelector('.nav-progress')).toBeNull();
    });

    it('shows a loading bar after navigation', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/']}>
                <Harness to="/new" />
            </MemoryRouter>,
        );

        act(() => {
            vi.advanceTimersByTime(0);
        });

        const bar = container.querySelector('.nav-progress');
        expect(bar).not.toBeNull();
    });

    it('transitions from loading → done → idle on the expected schedule', () => {
        const { container } = render(
            <MemoryRouter initialEntries={['/']}>
                <Harness to="/x" />
            </MemoryRouter>,
        );

        // After both setTimeouts fire (≥550ms), the bar should be removed (idle)
        act(() => {
            vi.advanceTimersByTime(600);
        });

        expect(container.querySelector('.nav-progress')).toBeNull();
    });
});
