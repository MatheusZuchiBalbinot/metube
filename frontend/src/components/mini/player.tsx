import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Maximize2 } from 'lucide-react';
import { useVideo } from '@hooks/useVideo';
import { ROUTES } from '@utils/routes';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import VideoPlayer from '@components/player/player';
import type { Video } from '@data/mockVideos';
import './player.css';

function defaultPos() {
    return {
        x: window.innerWidth - 360 - 24,
        y: window.innerHeight - 254 - 24,
    };
}

// eslint-disable-next-line complexity
export default function MiniPlayer() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { miniPlayer, closeMiniPlayer, videos, updateProgress, setPendingVideoSeek } = useVideo();
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<HTMLDivElement>(null);
    const pendingMiniSeekRef = useRef<number | null>(null);
    const [pos, setPos] = useState(defaultPos);
    const [isDragging, setIsDragging] = useState(false);
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef({ x: 0, y: 0 });

    const video = miniPlayer ? videos.find((v: Video) => v.id === miniPlayer.videoId) : null;
    const hasVideoFile = video?.videoUrl !== undefined && video?.videoUrl !== '';

    useEffect(() => {
        const el = videoRef.current;
        const isNotReady = !el || !miniPlayer;
        if (isNotReady) {
            return;
        }

        setPos(defaultPos());

        pendingMiniSeekRef.current = miniPlayer.currentTime;
        el.load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [miniPlayer?.videoId, miniPlayer?.seekSession]);

    function handleLoadedMetadata() {
        const el = videoRef.current;
        const seekTo = pendingMiniSeekRef.current;
        const hasSeek = el !== null && seekTo !== null && seekTo > 0;
        if (hasSeek) {
            el!.currentTime = seekTo!;
            pendingMiniSeekRef.current = null;
        }

        el?.play().catch(() => { });
    }

    useEffect(() => {
        if (!isDragging) {
            return;
        }

        function handleMouseMove(e: MouseEvent) {
            const el = playerRef.current;
            const playerW = el?.offsetWidth ?? 360;
            const playerH = el?.offsetHeight ?? 254;
            const x = Math.max(0, Math.min(e.clientX - dragOffsetRef.current.x, window.innerWidth - playerW));
            const y = Math.max(0, Math.min(e.clientY - dragOffsetRef.current.y, window.innerHeight - playerH));
            setPos({ x, y });
        }

        function handleMouseUp() {
            isDraggingRef.current = false;
            setIsDragging(false);
        }

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    function handleDragStart(e: React.MouseEvent<HTMLDivElement>) {
        const isButton = (e.target as HTMLElement).closest('button');
        if (isButton) {
            return;
        }

        isDraggingRef.current = true;
        setIsDragging(true);
        dragOffsetRef.current = {
            x: e.clientX - pos.x,
            y: e.clientY - pos.y,
        };

        e.preventDefault();
    }

    function handleDragKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
        const isArrowKey = e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight';
        if (!isArrowKey) {
            return;
        }

        e.preventDefault();

        const step = e.shiftKey ? 100 : 20;
        const el = playerRef.current;
        const playerW = el?.offsetWidth ?? 360;
        const playerH = el?.offsetHeight ?? 254;

        setPos(prev => {
            const isUp = e.key === 'ArrowUp';
            const isDown = e.key === 'ArrowDown';
            const isLeft = e.key === 'ArrowLeft';
            const isRight = e.key === 'ArrowRight';

            let xDelta = 0;
            if (isRight) {
                xDelta = step;
            } else if (isLeft) {
                xDelta = -step;
            }

            let yDelta = 0;
            if (isDown) {
                yDelta = step;
            } else if (isUp) {
                yDelta = -step;
            }

            const rawX = prev.x + xDelta;
            const rawY = prev.y + yDelta;

            const clampedX = Math.max(0, Math.min(rawX, window.innerWidth - playerW));
            const clampedY = Math.max(0, Math.min(rawY, window.innerHeight - playerH));

            return { x: clampedX, y: clampedY };
        });
    }

    function handleExpand() {
        const el = videoRef.current;
        if (el && miniPlayer) {
            const currentTime = el.currentTime;
            updateProgress(miniPlayer.videoId, el.duration > 0 ? (currentTime / el.duration) * 100 : 0);
            setPendingVideoSeek(miniPlayer.videoId, currentTime);

            el.pause();
        }

        closeMiniPlayer();
        if (miniPlayer) {
            navigate(ROUTES.VIDEO.replace(':id', miniPlayer.videoId));
        }
    }

    function handleClose() {
        const el = videoRef.current;
        if (el && miniPlayer) {
            updateProgress(miniPlayer.videoId, el.duration > 0 ? (el.currentTime / el.duration) * 100 : 0);
            el.pause();
        }

        closeMiniPlayer();
    }

    const isVisible = miniPlayer !== null && video !== null;

    if (!isVisible) {
        return null;
    }

    const outerClass = ['mini-player', isDragging ? 'mini-player--dragging' : ''].filter(Boolean).join(' ');

    return (
        <div
            ref={playerRef}
            className={outerClass}
            style={{ left: pos.x, top: pos.y }}
            role="region"
            aria-label={t('mini_player.label')}
        >
            <div className="mini-player__video-wrapper">
                {hasVideoFile ? (
                    <VideoPlayer
                        mode="mini"
                        videoRef={videoRef}
                        src={video!.videoUrl!}
                        captureKeyboard
                        onLoadedMetadata={handleLoadedMetadata}
                    />
                ) : (
                    <img
                        src={video!.thumbnail}
                        alt={video!.title}
                        className="mini-player__thumbnail"
                    />
                )}
            </div>

            <div
                className="mini-player__footer"
                onMouseDown={handleDragStart}
                onKeyDown={handleDragKeyDown}
                tabIndex={0}
                role="slider"
                aria-label={t('mini_player.drag')}
            >
                <div className="mini-player__info">
                    <p className="mini-player__title">{video!.title}</p>
                    <p className="mini-player__channel">{video!.channel}</p>
                </div>

                <div className="mini-player__controls">
                    <Tooltip content={t('mini_player.expand')} side="top">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleExpand}
                            aria-label={t('mini_player.expand')}
                            className="mini-player__btn"
                        >
                            <Maximize2 size={14} />
                        </Button>
                    </Tooltip>
                    <Tooltip content={t('common.close')} side="top">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            aria-label={t('common.close')}
                            className="mini-player__btn"
                        >
                            <X size={14} />
                        </Button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
