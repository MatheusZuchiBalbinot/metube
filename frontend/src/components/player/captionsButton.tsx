import { Captions, CaptionsOff, Check } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import Tooltip from '@ui/tooltip/tooltip';
import type { VideoCaption } from '@models';
import { cn } from '@utils';

interface CaptionsButtonProps {
    captions: VideoCaption[]
    activeTrack: string | null
    showMenu: boolean
    menuRef: React.RefObject<HTMLDivElement | null>
    onToggle: (e: React.MouseEvent) => void
    onSelect: (lang: string | null) => void
}

export default function CaptionsButton({ captions, activeTrack, showMenu, menuRef, onToggle, onSelect }: CaptionsButtonProps) {
    const { t } = useTranslation();

    const hasCaptions = captions.length > 0;
    if (!hasCaptions) {
        return null;
    }

    const isActive = activeTrack !== null;
    const label = t('player.captions');

    function handleSelectOff(e: React.MouseEvent) {
        e.stopPropagation();
        onSelect(null);
    }

    function makeSelectHandler(lang: string) {
        return function handleSelectLang(e: React.MouseEvent) {
            e.stopPropagation();
            onSelect(lang);
        };
    }

    return (
        <div className="vp__captions" ref={menuRef}>
            {showMenu && (
                <div className="vp__captions-menu" role="listbox" aria-label={label} onClick={e => e.stopPropagation()}>
                    <button
                        className={cn('vp__captions-option', activeTrack === null && 'vp__captions-option--active')}
                        role="option"
                        aria-selected={activeTrack === null}
                        onClick={handleSelectOff}
                    >
                        {t('player.captions_off')}
                        {activeTrack === null && <Check size={12} />}
                    </button>
                    {captions.map(c => (
                        <button
                            key={c.lang}
                            className={cn('vp__captions-option', activeTrack === c.lang && 'vp__captions-option--active')}
                            role="option"
                            aria-selected={activeTrack === c.lang}
                            onClick={makeSelectHandler(c.lang)}
                        >
                            {c.label}
                            {activeTrack === c.lang && <Check size={12} />}
                        </button>
                    ))}
                </div>
            )}
            <Tooltip content={label} side="top">
                <button
                    className={cn('vp__btn', isActive && 'vp__btn--active')}
                    aria-label={label}
                    aria-pressed={isActive}
                    aria-haspopup="listbox"
                    aria-expanded={showMenu}
                    onClick={onToggle}
                >
                    {isActive ? <Captions size={16} /> : <CaptionsOff size={16} />}
                </button>
            </Tooltip>
        </div>
    );
}
