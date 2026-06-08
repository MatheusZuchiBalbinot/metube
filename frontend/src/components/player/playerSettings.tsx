import { Settings, Check, Captions, Repeat, Repeat1, ListVideo, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ShakaLevel } from '@hooks';
import { cn } from '@utils';
import type { CaptionSize } from './playerTypes';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const CAPTION_SIZES: CaptionSize[] = ['sm', 'md', 'lg'];

interface PlayerSettingsProps {
    playbackRate: number
    showSettings: boolean
    settingsRef: React.RefObject<HTMLDivElement | null>
    onToggle: (e: React.MouseEvent) => void
    onSpeedChange: (e: React.MouseEvent, rate: number) => void
    levels?: ShakaLevel[]
    currentQuality?: number
    onQualityChange?: (e: React.MouseEvent, index: number) => void
    captionSize?: CaptionSize
    onCaptionSize?: (size: CaptionSize) => void
    isLoop?: boolean
    onToggleLoop?: () => void
    abStatus?: number
    onAbRepeat?: () => void
    isAutoplay?: boolean
    onToggleAutoplay?: () => void
    isAmbient?: boolean
    onToggleAmbient?: () => void
}

interface ToggleRowProps {
    icon: React.ReactNode
    label: string
    active: boolean
    onClick: () => void
}

function ToggleRow({ icon, label, active, onClick }: ToggleRowProps) {
    return (
        <button
            className={cn('vp__settings-option', active && 'vp__settings-option--active')}
            onClick={onClick}
            role="switch"
            aria-checked={active}
        >
            <span className="vp__settings-loop-label">
                {icon}
                {label}
            </span>
            {active && <Check size={12} />}
        </button>
    );
}

/**
 * Secondary toggles mirrored inside the settings menu. Hidden by default and only
 * revealed on narrow players (container query), where the inline buttons are dropped.
 */
function CompactToggles({
    isLoop, onToggleLoop, abStatus, onAbRepeat,
    isAutoplay, onToggleAutoplay, isAmbient, onToggleAmbient,
}: Pick<PlayerSettingsProps,
    'isLoop' | 'onToggleLoop' | 'abStatus' | 'onAbRepeat' | 'isAutoplay' | 'onToggleAutoplay' | 'isAmbient' | 'onToggleAmbient'
>) {
    const { t } = useTranslation();

    const rows: ToggleRowProps[] = [];

    if (onToggleAutoplay) {
        rows.push({ icon: <ListVideo size={13} />, label: t('player.autoplay'), active: isAutoplay ?? false, onClick: onToggleAutoplay });
    }

    if (onToggleLoop) {
        rows.push({ icon: <Repeat size={13} />, label: t('player.loop'), active: isLoop ?? false, onClick: onToggleLoop });
    }

    if (onAbRepeat) {
        rows.push({ icon: <Repeat1 size={13} />, label: t('player.ab_title'), active: (abStatus ?? 0) > 0, onClick: onAbRepeat });
    }

    if (onToggleAmbient) {
        rows.push({ icon: <Sparkles size={13} />, label: t('player.ambient'), active: isAmbient ?? false, onClick: onToggleAmbient });
    }

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="vp__settings-section vp__settings-compact">
            {rows.map(row => (
                <ToggleRow key={row.label} icon={row.icon} label={row.label} active={row.active} onClick={row.onClick} />
            ))}
        </div>
    );
}

export default function PlayerSettings({
    playbackRate, showSettings, settingsRef, onToggle, onSpeedChange,
    levels, currentQuality, onQualityChange, captionSize, onCaptionSize,
    isLoop, onToggleLoop, abStatus, onAbRepeat, isAutoplay, onToggleAutoplay, isAmbient, onToggleAmbient,
}: PlayerSettingsProps) {
    const { t } = useTranslation();
    const hasLevels = (levels?.length ?? 0) > 0;

    return (
        <div className="vp__settings" ref={settingsRef}>
            {showSettings && (
                <div className="vp__settings-panel" onClick={e => e.stopPropagation()}>
                    <div className="vp__settings-section">
                        <span className="vp__settings-section-label">{t('player.speed')}</span>
                        <div className="vp__settings-speeds" role="listbox" aria-label={t('player.speed')}>
                            {SPEED_OPTIONS.map(rate => {
                                const isActive = playbackRate === rate;
                                const optClass = cn('vp__settings-option', isActive && 'vp__settings-option--active');
                                return (
                                    <button
                                        key={rate}
                                        className={optClass}
                                        onClick={e => onSpeedChange(e, rate)}
                                        role="option"
                                        aria-selected={isActive}
                                    >
                                        <span>{rate === 1 ? '1×' : `${rate}×`}</span>
                                        {isActive && <Check size={12} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    {hasLevels && onQualityChange && (
                        <div className="vp__settings-section">
                            <span className="vp__settings-section-label">{t('player.quality')}</span>
                            <div className="vp__settings-speeds" role="listbox" aria-label={t('player.quality')}>
                                <button
                                    className={cn('vp__settings-option', currentQuality === -1 && 'vp__settings-option--active')}
                                    onClick={e => onQualityChange(e, -1)}
                                    role="option"
                                    aria-selected={currentQuality === -1}
                                >
                                    <span>{t('player.quality_auto')}</span>
                                    {currentQuality === -1 && <Check size={12} />}
                                </button>
                                {levels!.map(level => {
                                    const isActive = currentQuality === level.index;
                                    return (
                                        <button
                                            key={level.index}
                                            className={cn('vp__settings-option', isActive && 'vp__settings-option--active')}
                                            onClick={e => onQualityChange(e, level.index)}
                                            role="option"
                                            aria-selected={isActive}
                                        >
                                            <span>{level.label}</span>
                                            {isActive && <Check size={12} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {onCaptionSize && (
                        <div className="vp__settings-section">
                            <span className="vp__settings-section-label">
                                <Captions size={12} /> {t('player.caption_size')}
                            </span>
                            <div className="vp__settings-speeds" role="listbox" aria-label={t('player.caption_size')}>
                                {CAPTION_SIZES.map(size => {
                                    const isActive = captionSize === size;
                                    return (
                                        <button
                                            key={size}
                                            className={cn('vp__settings-option', isActive && 'vp__settings-option--active')}
                                            onClick={() => onCaptionSize(size)}
                                            role="option"
                                            aria-selected={isActive}
                                        >
                                            <span>{t(`player.caption_size_${size}`)}</span>
                                            {isActive && <Check size={12} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <CompactToggles
                        isLoop={isLoop}
                        onToggleLoop={onToggleLoop}
                        abStatus={abStatus}
                        onAbRepeat={onAbRepeat}
                        isAutoplay={isAutoplay}
                        onToggleAutoplay={onToggleAutoplay}
                        isAmbient={isAmbient}
                        onToggleAmbient={onToggleAmbient}
                    />
                </div>
            )}
            <button
                className="vp__btn"
                onClick={onToggle}
                title={t('player.settings')}
                aria-label={t('player.settings')}
                aria-expanded={showSettings}
                aria-haspopup="true"
            >
                <Settings size={16} />
            </button>
        </div>
    );
}
