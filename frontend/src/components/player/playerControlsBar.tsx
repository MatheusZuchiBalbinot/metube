import { Play, Pause, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDuration } from '@utils';
import CaptionsButton from './captionsButton';
import PlayerSettings from './playerSettings';
import PipButton from './pipButton';
import TheaterButton from './theaterButton';
import type { VideoCaption } from '@models';

interface PlayerControlsBarProps {
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    isMuted: boolean
    playbackRate: number
    isFullscreen: boolean
    isTheaterMode: boolean
    isPiP: boolean
    isPiPSupported: boolean
    showSettings: boolean
    settingsRef: React.RefObject<HTMLDivElement | null>
    captions: VideoCaption[]
    activeTrack: string | null
    showCaptionsMenu: boolean
    captionsMenuRef: React.RefObject<HTMLDivElement | null>
    levels: { height: number; bitrate: number }[]
    currentQuality: number
    onBarClick: (e: React.MouseEvent) => void
    onTogglePlay: (e: React.MouseEvent) => void
    onToggleMute: (e: React.MouseEvent) => void
    onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    onToggleSettings: (e: React.MouseEvent) => void
    onToggleCaptionsMenu: (e: React.MouseEvent) => void
    onSpeedChange: (e: React.MouseEvent, rate: number) => void
    onQualityChange: (e: React.MouseEvent, index: number) => void
    onPip: (e: React.MouseEvent) => void
    onTheater: (e: React.MouseEvent) => void
    onFullscreen: (e: React.MouseEvent) => void
    onCaptionSelect: (lang: string | null) => void
    showTheaterButton: boolean
    fullscreenIcon: React.ReactNode
}

export default function PlayerControlsBar({
    isPlaying, currentTime, duration, volume, isMuted, playbackRate,
    isFullscreen, isTheaterMode, isPiP, isPiPSupported,
    showSettings, settingsRef, captions, activeTrack, showCaptionsMenu, captionsMenuRef,
    levels, currentQuality,
    onBarClick, onTogglePlay, onToggleMute, onVolumeChange,
    onToggleSettings, onToggleCaptionsMenu, onSpeedChange, onQualityChange,
    onPip, onTheater, onFullscreen, onCaptionSelect,
    showTheaterButton, fullscreenIcon,
}: PlayerControlsBarProps) {
    const { t } = useTranslation();

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

                <span className="vp__time">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                </span>
            </div>

            <div className="vp__bar-right">
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
