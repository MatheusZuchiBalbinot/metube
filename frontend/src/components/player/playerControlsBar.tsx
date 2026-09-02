import { useState } from 'react';
import { Play, Pause, Volume1, Volume2, VolumeX, Repeat, Repeat1, Sparkles, ListVideo } from '@components/icons/icons';
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

function resolveAbHintKey(abStatus: number): typeof AB_HINT_KEYS[number] {
    return AB_HINT_KEYS[abStatus] ?? AB_HINT_KEYS[0];
}

function resolveTimeLabel(showRemaining: boolean, currentTime: number, duration: number): string {
    return showRemaining
        ? `-${formatDuration(Math.max(duration - currentTime, 0) as Seconds)} / ${formatDuration(duration as Seconds)}`
        : `${formatDuration(currentTime as Seconds)} / ${formatDuration(duration as Seconds)}`;
}

interface VolumeSliderProps {
    isMuted: boolean
    volume: number
    onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    ariaLabel: string
}

function VolumeSlider({ isMuted, volume, onVolumeChange, ariaLabel }: VolumeSliderProps) {
    return (
        <input
            type="range"
            className="vp__volume-slider"
            min="0" max="1" step="0.05"
            value={isMuted ? 0 : volume}
            onChange={onVolumeChange}
            aria-label={ariaLabel}
            style={{ '--vol': isMuted ? '0%' : `${volume * 100}%` } as React.CSSProperties}
        />
    );
}

interface ToggleIconButtonProps {
    tooltipTitle: string
    tooltipContent: string
    isActive: boolean
    onClick: () => void
    ariaLabel: string
    icon: React.ReactNode
}

function ToggleIconButton({ tooltipTitle, tooltipContent, isActive, onClick, ariaLabel, icon }: ToggleIconButtonProps) {
    return (
        <Tooltip title={tooltipTitle} content={tooltipContent} side="top">
            <button
                className={cn('vp__btn', isActive && 'vp__btn--active')}
                onClick={onClick}
                aria-label={ariaLabel}
                aria-pressed={isActive}
            >
                {icon}
            </button>
        </Tooltip>
    );
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

    const playPauseLabel = isPlaying ? t('player.pause') : t('player.play');
    const muteLabel = isMuted ? t('player.unmute') : t('player.mute');
    const fullscreenLabel = isFullscreen ? t('player.exit_fullscreen') : t('player.fullscreen');

    return (
        <div className="vp__bar" onClick={onBarClick}>
            <div className="vp__bar-left">
                <button
                    className="vp__btn"
                    onClick={onTogglePlay}
                    title={playPauseLabel}
                    aria-label={playPauseLabel}
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
                        title={muteLabel}
                        aria-label={muteLabel}
                    >
                        {getVolumeIcon()}
                    </button>
                    <VolumeSlider
                        isMuted={isMuted}
                        volume={volume}
                        onVolumeChange={onVolumeChange}
                        ariaLabel={t('player.volume')}
                    />
                </div>

                <button
                    type="button"
                    className="vp__time"
                    onClick={handleToggleTimeDisplay}
                    title={t('player.toggle_time')}
                >
                    {resolveTimeLabel(showRemaining, currentTime, duration)}
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
                    <ToggleIconButton
                        tooltipTitle={t('player.autoplay')}
                        tooltipContent={t('player.autoplay_hint')}
                        isActive={isAutoplay}
                        onClick={onToggleAutoplay}
                        ariaLabel={t('player.autoplay')}
                        icon={<ListVideo size={16} />}
                    />

                    <ToggleIconButton
                        tooltipTitle={t('player.loop')}
                        tooltipContent={t('player.loop_hint')}
                        isActive={isLoop}
                        onClick={onToggleLoop}
                        ariaLabel={t('player.loop')}
                        icon={<Repeat size={16} />}
                    />

                    <ToggleIconButton
                        tooltipTitle={t('player.ab_title')}
                        tooltipContent={t(resolveAbHintKey(abStatus))}
                        isActive={abStatus > 0}
                        onClick={onAbRepeat}
                        ariaLabel={t('player.ab_title')}
                        icon={<Repeat1 size={16} />}
                    />

                    <ToggleIconButton
                        tooltipTitle={t('player.ambient')}
                        tooltipContent={t('player.ambient_hint')}
                        isActive={isAmbient}
                        onClick={onToggleAmbient}
                        ariaLabel={t('player.ambient')}
                        icon={<Sparkles size={16} />}
                    />
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
                    title={fullscreenLabel}
                    aria-label={fullscreenLabel}
                    aria-pressed={isFullscreen}
                >
                    {fullscreenIcon}
                </button>
            </div>
        </div>
    );
}
