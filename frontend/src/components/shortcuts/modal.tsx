import { useTranslation } from 'react-i18next';
import { Keyboard } from 'lucide-react';
import Modal from '@ui/modal/modal';
import './modal.css';

interface ShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
}

interface Shortcut {
    keys: string[]
    label: string
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
    const { t } = useTranslation();

    const globalShortcuts: Shortcut[] = [
        { keys: ['/', 'F'], label: t('shortcuts.focus_search') },
        { keys: ['U'], label: t('shortcuts.open_upload') },
        { keys: ['G', 'H'], label: t('shortcuts.go_history') },
        { keys: ['G', 'P'], label: t('shortcuts.go_profile') },
        { keys: ['G', 'S'], label: t('shortcuts.go_search') },
        { keys: ['?'], label: t('shortcuts.show_shortcuts') },
    ];

    const videoShortcuts: Shortcut[] = [
        { keys: ['Space'], label: t('shortcuts.play_pause') },
        { keys: ['L'], label: t('shortcuts.like') },
        { keys: ['S'], label: t('shortcuts.save') },
        { keys: ['T'], label: t('shortcuts.theater_mode') },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('shortcuts.title')} size="sm">
            <div className="shortcuts-modal">
                <div className="shortcuts-modal__section">
                    <h3 className="shortcuts-modal__section-title">{t('shortcuts.global')}</h3>
                    <div className="shortcuts-modal__list">
                        {globalShortcuts.map(s => (
                            <div key={s.label} className="shortcuts-modal__item">
                                <span className="shortcuts-modal__label">{s.label}</span>
                                <div className="shortcuts-modal__keys">
                                    {s.keys.map((k, i) => (
                                        <span key={i} className="shortcuts-modal__key">{k}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="shortcuts-modal__section">
                    <h3 className="shortcuts-modal__section-title">{t('shortcuts.video_page')}</h3>
                    <div className="shortcuts-modal__list">
                        {videoShortcuts.map(s => (
                            <div key={s.label} className="shortcuts-modal__item">
                                <span className="shortcuts-modal__label">{s.label}</span>
                                <div className="shortcuts-modal__keys">
                                    {s.keys.map((k, i) => (
                                        <span key={i} className="shortcuts-modal__key">{k}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <p className="shortcuts-modal__footer">
                    <Keyboard size={12} />
                    {t('shortcuts.tip')}
                </p>
            </div>
        </Modal>
    );
}
