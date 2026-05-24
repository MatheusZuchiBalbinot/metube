import { Settings, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ShakaLevel } from '@hooks';
import { cn } from '@utils';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

interface PlayerSettingsProps {
    playbackRate: number
    showSettings: boolean
    settingsRef: React.RefObject<HTMLDivElement | null>
    onToggle: (e: React.MouseEvent) => void
    onSpeedChange: (e: React.MouseEvent, rate: number) => void
    levels?: ShakaLevel[]
    currentQuality?: number
    onQualityChange?: (e: React.MouseEvent, index: number) => void
}

export default function PlayerSettings({
    playbackRate, showSettings, settingsRef, onToggle, onSpeedChange,
    levels, currentQuality, onQualityChange,
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
