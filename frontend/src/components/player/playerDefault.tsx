import { useRef, useState, useEffect } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { cn, parseChapterTimestamp, STORAGE_KEYS } from '@utils';
import { useTranslation } from 'react-i18next';
import PlayerOverlays from './playerOverlays';
import PlayerSeekBar from './playerSeekBar';
import PlayerControlsBar from './playerControlsBar';
import type { VideoPlayerProps } from './player';
import { KEYBOARD_SKIP_SECONDS, type CaptionSize } from './playerTypes';
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
    useClickOutside,
    usePlayerAbRepeat,
    usePlayerHoldSpeed,
    HOLD_SPEED_RATE,
    usePlaybackPrefs,
} from '@hooks';

function loadCaptionSize(): CaptionSize {
    const raw = localStorage.getItem(STORAGE_KEYS.CAPTION_SIZE);
    return raw === 'sm' || raw === 'lg' ? raw : 'md';
}

function activeChapterTitle(chapters: VideoPlayerProps['chapters'], currentTime: number): string | null {
    if (chapters === undefined || chapters.length === 0) {
        return null;
    }

    let title: string | null = null;
    for (const chapter of chapters) {
        if (parseChapterTimestamp(chapter.timestamp) <= currentTime) {
            title = chapter.title;
        }
    }
    return title;
}

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
    const captionsMenuRef = useRef<HTMLDivElement>(null);

    const { t } = useTranslation();

    const [showSettings, setShowSettings] = useState(false);
    const [showCaptionsMenu, setShowCaptionsMenu] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isLoop, setIsLoop] = useState(false);
    const { abRepeat, abStatus, handleAbRepeat } = usePlayerAbRepeat(videoRef, src);
    const [ambientEnabled, setAmbientEnabled] = useState(() => localStorage.getItem(STORAGE_KEYS.PLAYER_AMBIENT) !== 'false');
    const [captionSize, setCaptionSize] = useState<CaptionSize>(loadCaptionSize);

    const { autoplay, setAutoplay } = usePlaybackPrefs();

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
    const { levels, currentQuality, setQuality, tracksLoaded } = useShaka(videoRef, src, captions);
    const { activeTrack, setActiveTrack } = usePlayerCaptions(captions);

    useVolumeWheel(containerRef, videoRef, applyVolume, revealControls);
    useClickOutside(settingsRef, handleCloseSettings);
    useClickOutside(captionsMenuRef, handleCloseCaptionsMenu);

    function handleCloseSettings() {
        setShowSettings(false);
    }

    function handleCloseCaptionsMenu() {
        setShowCaptionsMenu(false);
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

    const {
        holdSpeedActive,
        handleSurfacePointerDown,
        handleSurfacePointerEnd,
        handleSurfaceClick,
    } = usePlayerHoldSpeed(playbackRate, applyPlaybackRate, handleContainerClick);

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

    // Sync activeTrack → native TextTrack.mode once Shaka has loaded the tracks.
    // Use 'hidden' (not 'showing') so the browser's native renderer stays silent while
    // Shaka's SimpleTextDisplayer still reads the cues and renders its own <div> overlay.
    // 'showing' would cause both renderers to fire simultaneously → duplicate subtitles.
    useEffect(() => {
        if (!tracksLoaded) {
            return;
        }
        const el = videoRef.current;
        if (!el) {
            return;
        }
        for (let i = 0; i < el.textTracks.length; i++) {
            const track = el.textTracks[i];
            track.mode = track.language === activeTrack ? 'hidden' : 'disabled';
        }
    }, [activeTrack, tracksLoaded, videoRef]);

    // Reset local state when source changes. Playback rate is intentionally NOT
    // reset — the viewer's preferred speed persists across videos (usePlayerPlayback).
    useEffect(() => {
        resetPopIcon();
        resetSkipIndicator();
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional reset of UI state when the source changes
        setShowSettings(false);
        setShowCaptionsMenu(false);
        setIsDragging(false);
        setIsLoop(false);
        if (videoRef.current) {
            videoRef.current.loop = false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src]);

    function handleToggleLoop() {
        const el = videoRef.current;
        const next = !isLoop;
        setIsLoop(next);
        if (el) {
            el.loop = next;
        }
    }

    const chapterTitle = activeChapterTitle(chapters, currentTime);

    function handleToggleAmbient() {
        setAmbientEnabled(prev => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEYS.PLAYER_AMBIENT, String(next));
            return next;
        });
    }

    function handleToggleAutoplay() {
        setAutoplay(!autoplay);
    }

    function handleCaptionSize(size: CaptionSize) {
        setCaptionSize(size);
        localStorage.setItem(STORAGE_KEYS.CAPTION_SIZE, size);
    }

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

    function handleToggleCaptionsMenu(e: React.MouseEvent) {
        e.stopPropagation();
        setShowCaptionsMenu(v => !v);
    }

    function handleCaptionSelect(lang: string | null) {
        setActiveTrack(lang);
        setShowCaptionsMenu(false);
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
        `vp--cc-${captionSize}`,
    );

    const isTheaterMode = theaterMode ?? false;
    const ambientStyle = ambientEnabled && ambientColor !== undefined;

    return (
        <div
            className={wrapClass}
            ref={containerRef}
            onMouseMove={revealControls}
            onMouseLeave={handleMouseLeave}
            style={ambientStyle ? ({ '--vp-ambient': ambientColor } as React.CSSProperties) : undefined}
            onClick={handleSurfaceClick}
            onDoubleClick={handleContainerDoubleClick}
            onPointerDown={handleSurfacePointerDown}
            onPointerUp={handleSurfacePointerEnd}
            onPointerLeave={handleSurfacePointerEnd}
            onPointerCancel={handleSurfacePointerEnd}
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

            {holdSpeedActive && (
                <div className="vp__speed-hold" aria-hidden="true">
                    {t('player.speed_hold', { rate: HOLD_SPEED_RATE })}
                </div>
            )}

            <div className="vp__controls">
                <PlayerSeekBar
                    videoRef={videoRef}
                    src={src}
                    duration={duration}
                    bufferedPct={bufferedPct}
                    currentTime={currentTime}
                    chapters={chapters}
                    abRepeat={abRepeat}
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
                    showCaptionsMenu={showCaptionsMenu}
                    captionsMenuRef={captionsMenuRef}
                    levels={levels}
                    currentQuality={currentQuality}
                    onBarClick={handleBarClick}
                    onTogglePlay={handleTogglePlayBtn}
                    onToggleMute={handleToggleMute}
                    onVolumeChange={handleVolumeChange}
                    onToggleSettings={handleToggleSettings}
                    onToggleCaptionsMenu={handleToggleCaptionsMenu}
                    onSpeedChange={handleSpeedChange}
                    onQualityChange={handleQualityChange}
                    onPip={handlePipBtn}
                    onTheater={handleTheaterBtn}
                    onFullscreen={handleFullscreenBtn}
                    onCaptionSelect={handleCaptionSelect}
                    showTheaterButton={onTheaterToggle !== undefined}
                    fullscreenIcon={isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    isLoop={isLoop}
                    onToggleLoop={handleToggleLoop}
                    abStatus={abStatus}
                    onAbRepeat={handleAbRepeat}
                    chapterTitle={chapterTitle}
                    isAutoplay={autoplay}
                    onToggleAutoplay={handleToggleAutoplay}
                    isAmbient={ambientEnabled}
                    onToggleAmbient={handleToggleAmbient}
                    captionSize={captionSize}
                    onCaptionSize={handleCaptionSize}
                />
            </div>
        </div>
    );
}
