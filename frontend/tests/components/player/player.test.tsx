// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VideoPlayer from '@components/player/player';

vi.mock('@components/player/playerDefault', () => ({
    DefaultVideoPlayer: (props: { src: string }) => <div data-testid="default-player">{props.src}</div>,
}));
vi.mock('@components/player/playerMini', () => ({
    MiniVideoPlayer: (props: { src: string }) => <div data-testid="mini-player">{props.src}</div>,
}));

function makeVideoRef() {
    return { current: document.createElement('video') };
}

describe('VideoPlayer', () => {
    it('renders the default player when mode is "default" (or omitted)', () => {
        render(<VideoPlayer videoRef={makeVideoRef()} src="video.mp4" />);

        expect(screen.getByTestId('default-player')).toBeInTheDocument();
        expect(screen.queryByTestId('mini-player')).not.toBeInTheDocument();
    });

    it('renders the mini player when mode is "mini"', () => {
        render(<VideoPlayer videoRef={makeVideoRef()} src="video.mp4" mode="mini" />);

        expect(screen.getByTestId('mini-player')).toBeInTheDocument();
        expect(screen.queryByTestId('default-player')).not.toBeInTheDocument();
    });

    it('passes the src through to the rendered player', () => {
        render(<VideoPlayer videoRef={makeVideoRef()} src="https://example.com/v.mp4" mode="mini" />);

        expect(screen.getByTestId('mini-player')).toHaveTextContent('https://example.com/v.mp4');
    });
});
