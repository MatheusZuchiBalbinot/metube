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

function hasLevels(levels?: ShakaLevel[]): boolean {
    return (levels?.length ?? 0) > 0;
}

function resolveActivePanel(
    panel: SettingsPanel,
    levels: ShakaLevel[] | undefined,
    onQualityChange?: (e: React.MouseEvent, index: number) => void,
    onCaptionSize?: (size: CaptionSize) => void,
): SettingsPanel {
    if (panel === 'quality' && (!hasLevels(levels) || !onQualityChange)) {
        return 'root';
    }

    if (panel === 'captionSize' && !onCaptionSize) {
        return 'root';
    }

    return panel;
}

function resolveCurrentQualityLabel(
    currentQuality: number | undefined,
    levels: ShakaLevel[] | undefined,
    t: (key: string) => string,
): string {
    if (currentQuality === -1 || currentQuality === undefined) {
        return t('player.quality_auto');
    }

    return levels?.find(l => l.index === currentQuality)?.label ?? t('player.quality_auto');
}

interface RootPanelProps {
    viewClass: string
    playbackRate: number
    hasLevels: boolean
    onQualityChange?: (e: React.MouseEvent, index: number) => void
    currentQualityLabel: string
    captionSize?: CaptionSize
    onCaptionSize?: (size: CaptionSize) => void
    onDrillInto: (target: SettingsPanel) => void
    isLoop?: boolean
    onToggleLoop?: () => void
    abStatus?: number
    onAbRepeat?: () => void
    isAutoplay?: boolean
    onToggleAutoplay?: () => void
    isAmbient?: boolean
    onToggleAmbient?: () => void
}

function RootPanel({
    viewClass, playbackRate, hasLevels, onQualityChange, currentQualityLabel,
    captionSize, onCaptionSize, onDrillInto,
    isLoop, onToggleLoop, abStatus, onAbRepeat, isAutoplay, onToggleAutoplay, isAmbient, onToggleAmbient,
}: RootPanelProps) {
    const { t } = useTranslation();

    return (
        <div key="root" className={viewClass}>
            <div className="vp__settings-section">
                <DrillDownRow
                    icon={<Gauge size={13} />}
                    label={t('player.speed')}
                    value={`${playbackRate}×`}
                    onClick={() => onDrillInto('speed')}
                />
                {hasLevels && onQualityChange && (
                    <DrillDownRow
                        icon={<Settings size={13} />}
                        label={t('player.quality')}
                        value={currentQualityLabel}
                        onClick={() => onDrillInto('quality')}
                    />
                )}
                {onCaptionSize && captionSize && (
                    <DrillDownRow
                        icon={<Captions size={13} />}
                        label={t('player.caption_size')}
                        value={t(`player.caption_size_${captionSize}`)}
                        onClick={() => onDrillInto('captionSize')}
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
    );
}

interface SpeedPanelProps {
    viewClass: string
    playbackRate: number
    onSelectSpeed: (e: React.MouseEvent, rate: number) => void
    onBack: () => void
}

function SpeedPanel({ viewClass, playbackRate, onSelectSpeed, onBack }: SpeedPanelProps) {
    const { t } = useTranslation();

    return (
        <div key="speed" className={cn(viewClass, 'vp__settings-section')}>
            <SubPanelHeader title={t('player.speed')} onBack={onBack} />
            <div className="vp__settings-speeds" role="listbox" aria-label={t('player.speed')}>
                {SPEED_OPTIONS.map(rate => {
                    const isActive = playbackRate === rate;
                    return (
                        <button
                            key={rate}
                            className={cn('vp__settings-option', isActive && 'vp__settings-option--active')}
                            onClick={e => onSelectSpeed(e, rate)}
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
    );
}

interface QualityPanelProps {
    viewClass: string
    levels: ShakaLevel[]
    currentQuality?: number
    onSelectQuality: (e: React.MouseEvent, index: number) => void
    onBack: () => void
}

function QualityPanel({ viewClass, levels, currentQuality, onSelectQuality, onBack }: QualityPanelProps) {
    const { t } = useTranslation();

    return (
        <div key="quality" className={cn(viewClass, 'vp__settings-section')}>
            <SubPanelHeader title={t('player.quality')} onBack={onBack} />
            <div className="vp__settings-speeds" role="listbox" aria-label={t('player.quality')}>
                <button
                    className={cn('vp__settings-option', currentQuality === -1 && 'vp__settings-option--active')}
                    onClick={e => onSelectQuality(e, -1)}
                    role="option"
                    aria-selected={currentQuality === -1}
                >
                    <span>{t('player.quality_auto')}</span>
                    {currentQuality === -1 && <Check size={12} />}
                </button>
                {levels.map(level => {
                    const isActive = currentQuality === level.index;
                    return (
                        <button
                            key={level.index}
                            className={cn('vp__settings-option', isActive && 'vp__settings-option--active')}
                            onClick={e => onSelectQuality(e, level.index)}
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
    );
}

interface CaptionSizePanelProps {
    viewClass: string
    captionSize?: CaptionSize
    onSelectCaptionSize: (size: CaptionSize) => void
    onBack: () => void
}

function CaptionSizePanel({ viewClass, captionSize, onSelectCaptionSize, onBack }: CaptionSizePanelProps) {
    const { t } = useTranslation();

    return (
        <div key="captionSize" className={cn(viewClass, 'vp__settings-section')}>
            <SubPanelHeader title={t('player.caption_size')} onBack={onBack} />
            <div className="vp__settings-speeds" role="listbox" aria-label={t('player.caption_size')}>
                {CAPTION_SIZES.map(size => {
                    const isActive = captionSize === size;
                    return (
                        <button
                            key={size}
                            className={cn('vp__settings-option', isActive && 'vp__settings-option--active')}
                            onClick={() => onSelectCaptionSize(size)}
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
    );
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
    const activePanel = resolveActivePanel(panel, levels, onQualityChange, onCaptionSize);
    const currentQualityLabel = resolveCurrentQualityLabel(currentQuality, levels, t);

    return (
        <div className="vp__settings-panel" onClick={e => e.stopPropagation()}>
            {activePanel === 'root' && (
                <RootPanel
                    viewClass={viewClass}
                    playbackRate={playbackRate}
                    hasLevels={hasLevels(levels)}
                    onQualityChange={onQualityChange}
                    currentQualityLabel={currentQualityLabel}
                    captionSize={captionSize}
                    onCaptionSize={onCaptionSize}
                    onDrillInto={drillInto}
                    isLoop={isLoop}
                    onToggleLoop={onToggleLoop}
                    abStatus={abStatus}
                    onAbRepeat={onAbRepeat}
                    isAutoplay={isAutoplay}
                    onToggleAutoplay={onToggleAutoplay}
                    isAmbient={isAmbient}
                    onToggleAmbient={onToggleAmbient}
                />
            )}

            {activePanel === 'speed' && (
                <SpeedPanel viewClass={viewClass} playbackRate={playbackRate} onSelectSpeed={selectSpeed} onBack={backToRoot} />
            )}

            {activePanel === 'quality' && (
                <QualityPanel
                    viewClass={viewClass}
                    levels={levels ?? []}
                    currentQuality={currentQuality}
                    onSelectQuality={selectQuality}
                    onBack={backToRoot}
                />
            )}

            {activePanel === 'captionSize' && (
                <CaptionSizePanel viewClass={viewClass} captionSize={captionSize} onSelectCaptionSize={selectCaptionSize} onBack={backToRoot} />
            )}
        </div>
    );
}
