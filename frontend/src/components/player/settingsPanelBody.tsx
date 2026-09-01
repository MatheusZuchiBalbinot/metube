import { useState } from 'react';
import { Settings, Check, Captions, Gauge } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import { SIZES } from '@ui/types';
import type { CaptionSize, ShakaLevel, SettingsPanel, SettingsPanelDirection } from './playerTypes';
import DrillDownRow from './settingsDrillDownRow';
import SubPanelHeader from './settingsSubPanelHeader';
import CompactToggles from './settingsCompactToggles';

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
const CAPTION_SIZES: readonly CaptionSize[] = SIZES;

export interface SettingsPanelBodyProps {
    playbackRate: number
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

/**
 * Only mounted while the settings menu is open (see PlayerSettings' conditional
 * render), so its own `panel` state naturally starts fresh at 'root' every time
 * the menu is reopened — no effect or ref needed to reset it on close.
 */
export default function SettingsPanelBody({
    playbackRate, onSpeedChange, levels, currentQuality, onQualityChange, captionSize, onCaptionSize,
    isLoop, onToggleLoop, abStatus, onAbRepeat, isAutoplay, onToggleAutoplay, isAmbient, onToggleAmbient,
}: SettingsPanelBodyProps) {
    const { t } = useTranslation();
    const hasLevels = (levels?.length ?? 0) > 0;
    const [panel, setPanel] = useState<SettingsPanel>('root');
    const [direction, setDirection] = useState<SettingsPanelDirection>('forward');

    function drillInto(target: SettingsPanel) {
        setDirection('forward');
        setPanel(target);
    }

    function backToRoot() {
        setDirection('back');
        setPanel('root');
    }

    const currentQualityLabel = currentQuality === -1 || currentQuality === undefined
        ? t('player.quality_auto')
        : (levels?.find(l => l.index === currentQuality)?.label ?? t('player.quality_auto'));

    function selectSpeed(e: React.MouseEvent, rate: number) {
        onSpeedChange(e, rate);
        backToRoot();
    }

    function selectQuality(e: React.MouseEvent, index: number) {
        onQualityChange?.(e, index);
        backToRoot();
    }

    function selectCaptionSize(size: CaptionSize) {
        onCaptionSize?.(size);
        backToRoot();
    }

    const viewClass = cn('vp__settings-view', direction === 'forward' ? 'vp__settings-view--forward' : 'vp__settings-view--back');

    return (
        <div className="vp__settings-panel" onClick={e => e.stopPropagation()}>
            {panel === 'root' && (
                <div key="root" className={viewClass}>
                    <div className="vp__settings-section">
                        <DrillDownRow
                            icon={<Gauge size={13} />}
                            label={t('player.speed')}
                            value={`${playbackRate}×`}
                            onClick={() => drillInto('speed')}
                        />
                        {hasLevels && onQualityChange && (
                            <DrillDownRow
                                icon={<Settings size={13} />}
                                label={t('player.quality')}
                                value={currentQualityLabel}
                                onClick={() => drillInto('quality')}
                            />
                        )}
                        {onCaptionSize && captionSize && (
                            <DrillDownRow
                                icon={<Captions size={13} />}
                                label={t('player.caption_size')}
                                value={t(`player.caption_size_${captionSize}`)}
                                onClick={() => drillInto('captionSize')}
                            />
                        )}
                    </div>
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

            {panel === 'speed' && (
                <div key="speed" className={cn(viewClass, 'vp__settings-section')}>
                    <SubPanelHeader title={t('player.speed')} onBack={backToRoot} />
                    <div className="vp__settings-speeds" role="listbox" aria-label={t('player.speed')}>
                        {SPEED_OPTIONS.map(rate => {
                            const isActive = playbackRate === rate;
                            return (
                                <button
                                    key={rate}
                                    className={cn('vp__settings-option', isActive && 'vp__settings-option--active')}
                                    onClick={e => selectSpeed(e, rate)}
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
            )}

            {panel === 'quality' && hasLevels && onQualityChange && (
                <div key="quality" className={cn(viewClass, 'vp__settings-section')}>
                    <SubPanelHeader title={t('player.quality')} onBack={backToRoot} />
                    <div className="vp__settings-speeds" role="listbox" aria-label={t('player.quality')}>
                        <button
                            className={cn('vp__settings-option', currentQuality === -1 && 'vp__settings-option--active')}
                            onClick={e => selectQuality(e, -1)}
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
                                    onClick={e => selectQuality(e, level.index)}
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

            {panel === 'captionSize' && onCaptionSize && (
                <div key="captionSize" className={cn(viewClass, 'vp__settings-section')}>
                    <SubPanelHeader title={t('player.caption_size')} onBack={backToRoot} />
                    <div className="vp__settings-speeds" role="listbox" aria-label={t('player.caption_size')}>
                        {CAPTION_SIZES.map(size => {
                            const isActive = captionSize === size;
                            return (
                                <button
                                    key={size}
                                    className={cn('vp__settings-option', isActive && 'vp__settings-option--active')}
                                    onClick={() => selectCaptionSize(size)}
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
        </div>
    );
}
