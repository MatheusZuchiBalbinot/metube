import { useRef, useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { cn } from '@utils';
import PlayerOverlays from './playerOverlays';
import PlayerSeekBar from './playerSeekBar';
import PlayerControlsBar from './playerControlsBar';
import type { VideoPlayerProps } from './player';
import { KEYBOARD_SKIP_SECONDS } from './playerTypes';
import { PopIconType } from '@enums/popIconType';
import {
    usePlayerControls,
    usePlayerPlayback,
    usePlayerKeyboard,
    usePlayerCaptions,
    usePictureInPicture,
    useShaka,
    usePopIcon,
    useSkipIndicator,
    useFullscreen,
    useVolumeWheel,
    useClickDoubleClick,
    useOutsideClick,
} from '@hooks';

// eslint-disable-next-line complexity
export function DefaultVideoPlayer({
    videoRef,
    src,
    autoPlay = true,
    chapters,
    captions = [],
    theaterMode,
    onTheaterToggle,
    showCompletion,
    ambientColor,
    captureKeyboard,
    onTimeUpdate,
    onEnded,
    onLoadedMetadata,
}: Omit<VideoPlayerProps, 'mode'>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const settingsRef = useRef<HTMLDivElement>(null);

    const [showSettings, setShowSettings] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // ─── Hooks ────────────────────────────────────────────────────────────────

    const {
        showControls, setShowControls,
        scheduleHideControls, revealControls, forceShow,
    } = usePlayerControls(videoRef);

    const {
        isPlaying, isBuffering, currentTime, duration,
        volume, isMuted, playbackRate, bufferedPct,
        setIsBuffering,
        handleVideoPlay, handleVideoPause, handleVideoTimeUpdate,
        handleVideoLoadedMetadata, handleVideoEnded, handleVideoProgress,
        handleTogglePlay, applyVolume, applyMuteToggle, applyPlaybackRate,
    } = usePlayerPlayback(videoRef, {
        callbacks: { onTimeUpdate, onEnded, onLoadedMetadata },
        scheduleHideControls,
        forceShowControls: forceShow,
    });

    const { popIcon, showPopIcon, resetPopIcon } = usePopIcon();
    const { skipIndicator, showSkipIndicator, resetSkipIndicator } = useSkipIndicator();
    const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef);
    const { isActive: isPiP, isSupported: isPiPSupported, togglePiP } = usePictureInPicture(videoRef);
    const { levels, currentQuality, setQuality } = useShaka(videoRef, src);
    const { activeTrack, setActiveTrack } = usePlayerCaptions(videoRef, captions);

    useVolumeWheel(containerRef, videoRef, applyVolume, revealControls);
    useOutsideClick(settingsRef, handleCloseSettings);

    function handleCloseSettings() {
        setShowSettings(false);
    }

    function handleMouseLeave() {
        const isVideoPaused = videoRef.current?.paused ?? true;
        const shouldHide = !isVideoPaused && !isDragging;

        if (shouldHide) {
            setShowControls(false);
        }
    }

    function handleWaiting() {
        setIsBuffering(true);
    }

    function handleCanPlay() {
        setIsBuffering(false);
    }

    function handlePlaying() {
        setIsBuffering(false);
    }

    function handleBarClick(e: React.MouseEvent) {
        e.stopPropagation();
    }

    function handleTogglePlayWithFeedback() {
        const wasPaused = videoRef.current?.paused ?? true;
        handleTogglePlay();
        showPopIcon(wasPaused ? PopIconType.PLAY : PopIconType.PAUSE);
    }

    const { handleClick: handleContainerClick, handleDoubleClick: handleContainerDoubleClick } =
        useClickDoubleClick(handleTogglePlayWithFeedback, toggleFullscreen);

    const shouldCaptureKeyboard = captureKeyboard ?? true;
    usePlayerKeyboard({
        videoRef,
        isDefault: true,
        captureKeyboard: shouldCaptureKeyboard,
        onTogglePlay: handleTogglePlayWithFeedback,
        onSkip: showSkipIndicator,
        onVolumeChange: applyVolume,
        onMuteToggle: applyMuteToggle,
        onFullscreenToggle: toggleFullscreen,
        onTheaterToggle,
        onPipToggle: togglePiP,
        onCaptionsToggle: () => {
            const isOff = activeTrack === null;
            const firstTrack = captions[0]?.lang ?? null;
            setActiveTrack(isOff ? firstTrack : null);
        },
    });

    // ─── Effects ──────────────────────────────────────────────────────────────

    // Reset local state when source changes
    useEffect(() => {
        resetPopIcon();
        resetSkipIndicator();
        applyPlaybackRate(1);
        setShowSettings(false);
        setIsDragging(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    // ─── Event handlers ───────────────────────────────────────────────────────

    function handleTogglePlayBtn(e: React.MouseEvent) {
        e.stopPropagation();
        handleTogglePlayWithFeedback();
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        e.stopPropagation();
        applyVolume(Number(e.target.value));
    }

    function handleToggleMute(e: React.MouseEvent) {
        e.stopPropagation();
        applyMuteToggle();
    }

    function handleSpeedChange(e: React.MouseEvent, rate: number) {
        e.stopPropagation();
        applyPlaybackRate(rate);
        setShowSettings(false);
    }

    function handleQualityChange(e: React.MouseEvent, index: number) {
        e.stopPropagation();
        setQuality(index);
        setShowSettings(false);
    }

    function handleFullscreenBtn(e: React.MouseEvent) {
        e.stopPropagation();
        toggleFullscreen();
    }

    function handleToggleSettings(e: React.MouseEvent) {
        e.stopPropagation();
        setShowSettings(v => !v);
    }

    function handleTheaterBtn(e: React.MouseEvent) {
        e.stopPropagation();
        onTheaterToggle?.();
    }

    function handlePipBtn(e: React.MouseEvent) {
        e.stopPropagation();
        togglePiP();
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    const wrapClass = cn(
        'vp',
        showControls && 'vp--controls-visible',
        (theaterMode ?? false) && 'vp--theater',
        isDragging && 'vp--seeking',
    );

    const isTheaterMode = theaterMode ?? false;

    return (
        <div
            className={wrapClass}
            ref={containerRef}
            onMouseMove={revealControls}
            onMouseLeave={handleMouseLeave}
            style={ambientColor ? ({ '--vp-ambient': ambientColor } as React.CSSProperties) : undefined}
            onClick={handleContainerClick}
            onDoubleClick={handleContainerDoubleClick}
        >
            <video
                ref={videoRef}
                className="vp__video"
                autoPlay={autoPlay}
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onEnded={handleVideoEnded}
                onProgress={handleVideoProgress}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
                onPlaying={handlePlaying}
            />

            <PlayerOverlays
                isBuffering={isBuffering}
                showCompletion={showCompletion}
                popIcon={popIcon}
                skipIndicator={skipIndicator}
                skipSeconds={KEYBOARD_SKIP_SECONDS}
            />

            <div className="vp__controls">
                <PlayerSeekBar
                    videoRef={videoRef}
                    src={src}
                    duration={duration}
                    bufferedPct={bufferedPct}
                    currentTime={currentTime}
                    chapters={chapters}
                    forceShow={forceShow}
                    scheduleHideControls={scheduleHideControls}
                    onDraggingChange={setIsDragging}
                />

                <PlayerControlsBar
                    isPlaying={isPlaying}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    isMuted={isMuted}
                    playbackRate={playbackRate}
                    isFullscreen={isFullscreen}
                    isTheaterMode={isTheaterMode}
                    isPiP={isPiP}
                    isPiPSupported={isPiPSupported}
                    showSettings={showSettings}
                    settingsRef={settingsRef}
                    captions={captions}
                    activeTrack={activeTrack}
                    levels={levels}
                    currentQuality={currentQuality}
                    onBarClick={handleBarClick}
                    onTogglePlay={handleTogglePlayBtn}
                    onToggleMute={handleToggleMute}
                    onVolumeChange={handleVolumeChange}
                    onToggleSettings={handleToggleSettings}
                    onSpeedChange={handleSpeedChange}
                    onQualityChange={handleQualityChange}
                    onPip={handlePipBtn}
                    onTheater={handleTheaterBtn}
                    onFullscreen={handleFullscreenBtn}
                    onCaptionSelect={setActiveTrack}
                    showTheaterButton={onTheaterToggle !== undefined}
                    fullscreenIcon={isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                />
            </div>
        </div>
    );
}
