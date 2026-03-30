import { Settings, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

interface PlayerSettingsProps {
    playbackRate: number
    showSettings: boolean
    settingsRef: React.RefObject<HTMLDivElement | null>
    onToggle: (e: React.MouseEvent) => void
    onSpeedChange: (e: React.MouseEvent, rate: number) => void
}

export default function PlayerSettings({
    playbackRate, showSettings, settingsRef, onToggle, onSpeedChange,
}: PlayerSettingsProps) {
    const { t } = useTranslation();

    return (
        <div className="vp__settings" ref={settingsRef}>
            {showSettings && (
                <div className="vp__settings-panel" onClick={e => e.stopPropagation()}>
                    <div className="vp__settings-section">
                        <span className="vp__settings-section-label">{t('player.speed')}</span>
                        <div className="vp__settings-speeds" role="listbox" aria-label={t('player.speed')}>
                            {SPEED_OPTIONS.map(rate => {
                                const isActive = playbackRate === rate;
                                const optClass = [
                                    'vp__settings-option',
                                    isActive ? 'vp__settings-option--active' : '',
                                ].filter(Boolean).join(' ');
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
