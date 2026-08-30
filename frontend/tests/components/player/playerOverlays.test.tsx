// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PlayerOverlays from '@components/player/playerOverlays';
import { PopIconType } from '@enums/popIconType';
import { SkipDirection } from '@enums/skipDirection';

describe('PlayerOverlays', () => {
    it('shows the buffering spinner when buffering and not completed', () => {
        const { container } = render(
            <PlayerOverlays
                isBuffering={true}
                showCompletion={false}
                popIcon={null}
                skipIndicator={null}
                skipSeconds={5}
            />,
        );

        expect(container.querySelector('.vp__buffering')).toBeInTheDocument();
    });

    it('hides the buffering spinner during the completion overlay', () => {
        const { container } = render(
            <PlayerOverlays
                isBuffering={true}
                showCompletion={true}
                popIcon={null}
                skipIndicator={null}
                skipSeconds={5}
            />,
        );

        expect(container.querySelector('.vp__buffering')).not.toBeInTheDocument();
        expect(container.querySelector('.vp__completion')).toBeInTheDocument();
    });

    it('renders the play pop icon', () => {
        const { container } = render(
            <PlayerOverlays
                isBuffering={false}
                showCompletion={false}
                popIcon={{ type: PopIconType.PLAY, key: 1 }}
                skipIndicator={null}
                skipSeconds={5}
            />,
        );

        expect(container.querySelector('.vp__pop-icon')).toBeInTheDocument();
    });

    it('renders the skip indicator with the total seconds skipped', () => {
        render(
            <PlayerOverlays
                isBuffering={false}
                showCompletion={false}
                popIcon={null}
                skipIndicator={{ dir: SkipDirection.FWD, count: 2, key: 1 }}
                skipSeconds={5}
            />,
        );

        expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('renders nothing extra when all overlay states are inactive', () => {
        const { container } = render(
            <PlayerOverlays
                isBuffering={false}
                showCompletion={false}
                popIcon={null}
                skipIndicator={null}
                skipSeconds={5}
            />,
        );

        expect(container.querySelector('.vp__buffering')).not.toBeInTheDocument();
        expect(container.querySelector('.vp__pop-icon')).not.toBeInTheDocument();
        expect(container.querySelector('.vp__skip-indicator')).not.toBeInTheDocument();
        expect(container.querySelector('.vp__completion')).not.toBeInTheDocument();
    });
});
