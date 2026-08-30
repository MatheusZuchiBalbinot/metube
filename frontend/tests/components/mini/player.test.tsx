// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@ui';
import MiniPlayer from '@components/mini/player';
import { makeVideo, vid } from '../../helpers/factories';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...(actual as object),
        useNavigate: () => mockNavigate,
    };
});

const useVideoMock = vi.hoisted(() => vi.fn());
const useDraggablePositionMock = vi.hoisted(() => vi.fn());

vi.mock('@hooks', () => ({
    useVideo: useVideoMock,
    useDraggablePosition: useDraggablePositionMock,
}));

vi.mock('@components/player/player', () => ({
    default: (props: {
        src: string
        videoRef: React.RefObject<HTMLVideoElement | null>
        onLoadedMetadata?: () => void
    }) => (
        <div data-testid="video-player">
            <video ref={props.videoRef} />
            <span>{props.src}</span>
            <button onClick={() => props.onLoadedMetadata?.()}>trigger-loaded-metadata</button>
        </div>
    ),
}));

function baseVideoState(overrides: Record<string, unknown> = {}) {
    return {
        miniPlayer: { videoId: vid('v-1'), currentTime: 0, seekSession: 0 },
        closeMiniPlayer: vi.fn(),
        videos: [makeVideo({ id: vid('v-1'), title: 'Mini Video', channel: 'Some Channel', videoUrl: 'https://example.com/v.mp4' })],
        updateProgress: vi.fn(),
        setPendingVideoSeek: vi.fn(),
        autoplay: false,
        ...overrides,
    };
}

function baseDrag(overrides: Record<string, unknown> = {}) {
    return {
        pos: null,
        isDragging: false,
        startDrag: vi.fn(),
        nudge: vi.fn(),
        resetPos: vi.fn(),
        ...overrides,
    };
}

function renderMini() {
    return render(
        <MemoryRouter>
            <TooltipProvider delayDuration={0}>
                <MiniPlayer />
            </TooltipProvider>
        </MemoryRouter>,
    );
}

describe('MiniPlayer', () => {
    it('renders nothing when there is no active mini player', () => {
        useVideoMock.mockReturnValue(baseVideoState({ miniPlayer: null }));
        useDraggablePositionMock.mockReturnValue(baseDrag());

        const { container } = renderMini();

        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the referenced video cannot be found', () => {
        useVideoMock.mockReturnValue(baseVideoState({ videos: [] }));
        useDraggablePositionMock.mockReturnValue(baseDrag());

        const { container } = renderMini();

        expect(container).toBeEmptyDOMElement();
    });

    it('renders the video player with the video src when a video file is available', () => {
        useVideoMock.mockReturnValue(baseVideoState());
        useDraggablePositionMock.mockReturnValue(baseDrag());

        renderMini();

        expect(screen.getByTestId('video-player')).toBeInTheDocument();
        expect(screen.getByText('https://example.com/v.mp4')).toBeInTheDocument();
        expect(screen.getByText('Mini Video')).toBeInTheDocument();
    });

    it('renders a thumbnail instead of the player when there is no video file', () => {
        useVideoMock.mockReturnValue(baseVideoState({
            videos: [makeVideo({ id: vid('v-1'), title: 'No File Video', videoUrl: undefined })],
        }));
        useDraggablePositionMock.mockReturnValue(baseDrag());

        renderMini();

        expect(screen.queryByTestId('video-player')).not.toBeInTheDocument();
        expect(screen.getByAltText('No File Video')).toBeInTheDocument();
    });

    it('persists progress, sets the pending seek, closes the mini player and navigates on expand', async () => {
        const closeMiniPlayer = vi.fn();
        const setPendingVideoSeek = vi.fn();
        useVideoMock.mockReturnValue(baseVideoState({ closeMiniPlayer, setPendingVideoSeek }));
        useDraggablePositionMock.mockReturnValue(baseDrag());

        renderMini();

        fireEvent.click(screen.getByRole('button', { name: 'Open video' }));

        expect(closeMiniPlayer).toHaveBeenCalled();
        expect(setPendingVideoSeek).toHaveBeenCalledWith(vid('v-1'), 0);
        expect(mockNavigate).toHaveBeenCalledWith('/watch?v=v-1');
    });

    it('persists progress and closes the mini player on close, without navigating', () => {
        const closeMiniPlayer = vi.fn();
        useVideoMock.mockReturnValue(baseVideoState({ closeMiniPlayer }));
        useDraggablePositionMock.mockReturnValue(baseDrag());

        renderMini();
        mockNavigate.mockClear();

        fireEvent.click(screen.getByRole('button', { name: 'Close' }));

        expect(closeMiniPlayer).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('applies the dragging class and dragged position style when dragging state and pos are set', () => {
        useVideoMock.mockReturnValue(baseVideoState());
        useDraggablePositionMock.mockReturnValue(baseDrag({ isDragging: true, pos: { x: 10, y: 20 } }));

        const { container } = renderMini();
        const region = container.querySelector('.mini-player') as HTMLElement;

        expect(region).toHaveClass('mini-player--dragging');
        expect(region.style.left).toBe('10px');
        expect(region.style.top).toBe('20px');
    });

    it('nudges the position with arrow keys on the drag handle', () => {
        const nudge = vi.fn();
        useVideoMock.mockReturnValue(baseVideoState());
        useDraggablePositionMock.mockReturnValue(baseDrag({ nudge }));

        renderMini();
        const handle = screen.getByRole('button', { name: 'Drag to reposition' });
        fireEvent.keyDown(handle, { key: 'ArrowRight' });

        expect(nudge).toHaveBeenCalledWith(20, 0);
    });
});
