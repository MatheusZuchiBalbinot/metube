import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, Volume1, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Format } from '@utils/format';
import PlayerOverlays from './playerOverlays';
import PlayerSeekBar from './playerSeekBar';
import PlayerSettings from './playerSettings';
import PipButton from './pipButton';
import TheaterButton from './theaterButton';
import CaptionsButton from './captionsButton';
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
    const { t } = useTranslation();
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

    function getVolumeIcon() {
        const isVolumeZero = isMuted || volume === 0;
        const isVolumeLow = !isVolumeZero && volume < 0.5;

        if (isVolumeZero) {
            return <VolumeX size={16} />;
        }

        if (isVolumeLow) {
            return <Volume1 size={16} />;
        }

        return <Volume2 size={16} />;
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    const wrapClass = [
        'vp',
        showControls ? 'vp--controls-visible' : '',
        (theaterMode ?? false) ? 'vp--theater' : '',
        isDragging ? 'vp--seeking' : '',
    ].filter(Boolean).join(' ');

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
                autoPlay
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

                <div className="vp__bar" onClick={handleBarClick}>
                    <div className="vp__bar-left">
                        <button
                            className="vp__btn"
                            onClick={handleTogglePlayBtn}
                            title={isPlaying ? t('player.pause') : t('player.play')}
                            aria-label={isPlaying ? t('player.pause') : t('player.play')}
                        >
                            {isPlaying
                                ? <Pause size={18} fill="white" strokeWidth={0} />
                                : <Play size={18} fill="white" strokeWidth={0} />
                            }
                        </button>

                        <div className="vp__volume" onClick={handleBarClick}>
                            <button
                                className="vp__btn"
                                onClick={handleToggleMute}
                                title={isMuted ? t('player.unmute') : t('player.mute')}
                                aria-label={isMuted ? t('player.unmute') : t('player.mute')}
                            >
                                {getVolumeIcon()}
                            </button>
                            <input
                                type="range"
                                className="vp__volume-slider"
                                min="0" max="1" step="0.05"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                aria-label={t('player.volume')}
                                style={{ '--vol': isMuted ? '0%' : `${volume * 100}%` } as React.CSSProperties}
                            />
                        </div>

                        <span className="vp__time">
                            {Format.duration(currentTime)} / {Format.duration(duration)}
                        </span>
                    </div>

                    <div className="vp__bar-right">
                        <CaptionsButton
                            captions={captions}
                            activeTrack={activeTrack}
                            onSelect={setActiveTrack}
                        />

                        <PlayerSettings
                            playbackRate={playbackRate}
                            showSettings={showSettings}
                            settingsRef={settingsRef}
                            onToggle={handleToggleSettings}
                            onSpeedChange={handleSpeedChange}
                            levels={levels}
                            currentQuality={currentQuality}
                            onQualityChange={handleQualityChange}
                        />

                        <PipButton
                            isActive={isPiP}
                            isSupported={isPiPSupported}
                            onClick={handlePipBtn}
                        />

                        {onTheaterToggle !== undefined && (
                            <TheaterButton
                                isTheater={isTheaterMode}
                                onClick={handleTheaterBtn}
                            />
                        )}

                        <button
                            className="vp__btn"
                            onClick={handleFullscreenBtn}
                            title={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                            aria-label={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                            aria-pressed={isFullscreen}
                        >
                            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
