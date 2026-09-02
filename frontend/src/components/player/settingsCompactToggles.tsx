import { Repeat, Repeat1, ListVideo, Sparkles } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import ToggleRow, { type ToggleRowProps } from './settingsToggleRow';

interface CompactTogglesProps {
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
 * Secondary toggles mirrored inside the settings menu. Hidden by default and only
 * revealed on narrow players (container query), where the inline buttons are dropped.
 */
export default function CompactToggles({
    isLoop, onToggleLoop, abStatus, onAbRepeat,
    isAutoplay, onToggleAutoplay, isAmbient, onToggleAmbient,
}: CompactTogglesProps) {
    const { t } = useTranslation();

    const defs: { icon: React.ReactNode; label: string; active: boolean; onClick?: () => void }[] = [
        { icon: <ListVideo size={13} />, label: t('player.autoplay'), active: isAutoplay ?? false, onClick: onToggleAutoplay },
        { icon: <Repeat size={13} />, label: t('player.loop'), active: isLoop ?? false, onClick: onToggleLoop },
        { icon: <Repeat1 size={13} />, label: t('player.ab_title'), active: (abStatus ?? 0) > 0, onClick: onAbRepeat },
        { icon: <Sparkles size={13} />, label: t('player.ambient'), active: isAmbient ?? false, onClick: onToggleAmbient },
    ];

    const rows = defs.filter((d): d is ToggleRowProps => Boolean(d.onClick));

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
