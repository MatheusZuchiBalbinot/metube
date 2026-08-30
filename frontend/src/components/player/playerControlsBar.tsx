import { useState } from 'react';
import { Play, Pause, Volume1, Volume2, VolumeX, Repeat, Repeat1, Sparkles, ListVideo } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDuration, cn } from '@utils';
import Tooltip from '@ui/tooltip/tooltip';
import CaptionsButton from './captionsButton';
import PlayerSettings from './playerSettings';
import PipButton from './pipButton';
import TheaterButton from './theaterButton';
import type { CaptionSize, ShakaLevel } from './playerTypes';
import type { VideoCaption, Seconds } from '@models';

const AB_HINT_KEYS = ['player.ab_hint_a', 'player.ab_hint_b', 'player.ab_hint_clear'] as const;

export interface PlayerControlsPlayback {
    isPlaying: boolean
    currentTime: number
    duration: number
    playbackRate: number
    onTogglePlay: (e: React.MouseEvent) => void
    onSpeedChange: (e: React.MouseEvent, rate: number) => void
    isLoop: boolean
    onToggleLoop: () => void
    abStatus: number
    onAbRepeat: () => void
    isAutoplay: boolean
    onToggleAutoplay: () => void
    chapterTitle: string | null
}

export interface PlayerControlsAudio {
    volume: number
    isMuted: boolean
    onToggleMute: (e: React.MouseEvent) => void
    onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export interface PlayerControlsDisplay {
    isFullscreen: boolean
    isTheaterMode: boolean
    isPiP: boolean
    isPiPSupported: boolean
    showTheaterButton: boolean
    fullscreenIcon: React.ReactNode
    onFullscreen: (e: React.MouseEvent) => void
    onTheater: (e: React.MouseEvent) => void
    onPip: (e: React.MouseEvent) => void
    isAmbient: boolean
    onToggleAmbient: () => void
    captionSize: CaptionSize
    onCaptionSize: (size: CaptionSize) => void
}

export interface PlayerControlsMenus {
    showSettings: boolean
    settingsRef: React.RefObject<HTMLDivElement | null>
    onToggleSettings: (e: React.MouseEvent) => void
    captions: VideoCaption[]
    activeTrack: string | null
    showCaptionsMenu: boolean
    captionsMenuRef: React.RefObject<HTMLDivElement | null>
    onToggleCaptionsMenu: (e: React.MouseEvent) => void
    onCaptionSelect: (lang: string | null) => void
    levels: ShakaLevel[]
    currentQuality: number
    onQualityChange: (e: React.MouseEvent, index: number) => void
    onBarClick: (e: React.MouseEvent) => void
}

interface PlayerControlsBarProps {
    playback: PlayerControlsPlayback
    audio: PlayerControlsAudio
    display: PlayerControlsDisplay
    menus: PlayerControlsMenus
}

export default function PlayerControlsBar({ playback, audio, display, menus }: PlayerControlsBarProps) {
    const {
        isPlaying, currentTime, duration, playbackRate, onTogglePlay, onSpeedChange,
        isLoop, onToggleLoop, abStatus, onAbRepeat, isAutoplay, onToggleAutoplay, chapterTitle,
    } = playback;
    const { volume, isMuted, onToggleMute, onVolumeChange } = audio;
    const {
        isFullscreen, isTheaterMode, isPiP, isPiPSupported, showTheaterButton, fullscreenIcon,
        onFullscreen, onTheater, onPip, isAmbient, onToggleAmbient, captionSize, onCaptionSize,
    } = display;
    const {
        showSettings, settingsRef, onToggleSettings, captions, activeTrack, showCaptionsMenu,
        captionsMenuRef, onToggleCaptionsMenu, onCaptionSelect, levels, currentQuality,
        onQualityChange, onBarClick,
    } = menus;

    const { t } = useTranslation();
    const [showRemaining, setShowRemaining] = useState(false);

    function handleToggleTimeDisplay(e: React.MouseEvent) {
        e.stopPropagation();
        setShowRemaining(prev => !prev);
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

    return (
        <div className="vp__bar" onClick={onBarClick}>
            <div className="vp__bar-left">
                <button
                    className="vp__btn"
                    onClick={onTogglePlay}
                    title={isPlaying ? t('player.pause') : t('player.play')}
                    aria-label={isPlaying ? t('player.pause') : t('player.play')}
                >
                    {isPlaying
                        ? <Pause size={18} fill="white" strokeWidth={0} />
                        : <Play size={18} fill="white" strokeWidth={0} />
                    }
                </button>

                <div className="vp__volume" onClick={onBarClick}>
                    <button
                        className="vp__btn"
                        onClick={onToggleMute}
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
                        onChange={onVolumeChange}
                        aria-label={t('player.volume')}
                        style={{ '--vol': isMuted ? '0%' : `${volume * 100}%` } as React.CSSProperties}
                    />
                </div>

                <button
                    type="button"
                    className="vp__time"
                    onClick={handleToggleTimeDisplay}
                    title={t('player.toggle_time')}
                >
                    {showRemaining
                        ? `-${formatDuration(Math.max(duration - currentTime, 0) as Seconds)} / ${formatDuration(duration as Seconds)}`
                        : `${formatDuration(currentTime as Seconds)} / ${formatDuration(duration as Seconds)}`}
                </button>

                {chapterTitle !== null && (
                    <span className="vp__chapter-label" title={chapterTitle}>
                        <span className="vp__chapter-sep" aria-hidden="true">•</span>
                        {chapterTitle}
                    </span>
                )}
            </div>

            <div className="vp__bar-right">
                {/* Secondary toggles — shown inline on wide players; collapse into the
                    settings menu on narrow ones (see .vp__bar-toggles container query). */}
                <div className="vp__bar-toggles">
                    <Tooltip title={t('player.autoplay')} content={t('player.autoplay_hint')} side="top">
                        <button
                            className={cn('vp__btn', isAutoplay && 'vp__btn--active')}
                            onClick={onToggleAutoplay}
                            aria-label={t('player.autoplay')}
                            aria-pressed={isAutoplay}
                        >
                            <ListVideo size={16} />
                        </button>
                    </Tooltip>

                    <Tooltip title={t('player.loop')} content={t('player.loop_hint')} side="top">
                        <button
                            className={cn('vp__btn', isLoop && 'vp__btn--active')}
                            onClick={onToggleLoop}
                            aria-label={t('player.loop')}
                            aria-pressed={isLoop}
                        >
                            <Repeat size={16} />
                        </button>
                    </Tooltip>

                    <Tooltip title={t('player.ab_title')} content={t(AB_HINT_KEYS[abStatus] ?? AB_HINT_KEYS[0])} side="top">
                        <button
                            className={cn('vp__btn', abStatus > 0 && 'vp__btn--active')}
                            onClick={onAbRepeat}
                            aria-label={t('player.ab_title')}
                            aria-pressed={abStatus > 0}
                        >
                            <Repeat1 size={16} />
                        </button>
                    </Tooltip>

                    <Tooltip title={t('player.ambient')} content={t('player.ambient_hint')} side="top">
                        <button
                            className={cn('vp__btn', isAmbient && 'vp__btn--active')}
                            onClick={onToggleAmbient}
                            aria-label={t('player.ambient')}
                            aria-pressed={isAmbient}
                        >
                            <Sparkles size={16} />
                        </button>
                    </Tooltip>
                </div>

                <CaptionsButton
                    captions={captions}
                    activeTrack={activeTrack}
                    showMenu={showCaptionsMenu}
                    menuRef={captionsMenuRef}
                    onToggle={onToggleCaptionsMenu}
                    onSelect={onCaptionSelect}
                />

                <PlayerSettings
                    playbackRate={playbackRate}
                    showSettings={showSettings}
                    settingsRef={settingsRef}
                    onToggle={onToggleSettings}
                    onSpeedChange={onSpeedChange}
                    levels={levels}
                    currentQuality={currentQuality}
                    onQualityChange={onQualityChange}
                    captionSize={captionSize}
                    onCaptionSize={onCaptionSize}
                    isLoop={isLoop}
                    onToggleLoop={onToggleLoop}
                    abStatus={abStatus}
                    onAbRepeat={onAbRepeat}
                    isAutoplay={isAutoplay}
                    onToggleAutoplay={onToggleAutoplay}
                    isAmbient={isAmbient}
                    onToggleAmbient={onToggleAmbient}
                />

                <PipButton
                    isActive={isPiP}
                    isSupported={isPiPSupported}
                    onClick={onPip}
                />

                {showTheaterButton && (
                    <TheaterButton
                        isTheater={isTheaterMode}
                        onClick={onTheater}
                    />
                )}

                <button
                    className="vp__btn"
                    onClick={onFullscreen}
                    title={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                    aria-label={isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen')}
                    aria-pressed={isFullscreen}
                >
                    {fullscreenIcon}
                </button>
            </div>
        </div>
    );
}
