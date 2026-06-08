import React from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@ui/modal/modal';
import './modal.css';

interface ShortcutsModalProps {
    isOpen: boolean
    onClose: () => void
}

interface Shortcut {
    keys: string[]
    chord?: boolean
    label: string
}

function KeyBadge({ keys, chord }: { keys: string[]; chord?: boolean }) {
    if (chord) {
        return (
            <div className="shortcuts-modal__keys">
                <kbd className="shortcuts-modal__key">{keys[0]}</kbd>
                <span className="shortcuts-modal__then">then</span>
                <kbd className="shortcuts-modal__key">{keys[1]}</kbd>
            </div>
        );
    }

    const isAlternative = keys.length > 1;

    return (
        <div className="shortcuts-modal__keys">
            {keys.map((k, i) => (
                <React.Fragment key={k}>
                    {isAlternative && i > 0 && (
                        <span className="shortcuts-modal__or">or</span>
                    )}
                    <kbd className="shortcuts-modal__key">{k}</kbd>
                </React.Fragment>
            ))}
        </div>
    );
}

export default function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
    const { t } = useTranslation();

    const SHORTCUT_SECTIONS: { titleKey: string; titleDefault: string; shortcuts: Shortcut[]; noteKey?: string; noteDefault?: string }[] = [
        {
            titleKey: 'shortcuts.global',
            titleDefault: 'Navigation',
            shortcuts: [
                { keys: ['G', 'H'], chord: true, label: t('shortcuts.go_history', 'Go to History') },
                { keys: ['G', 'P'], chord: true, label: t('shortcuts.go_profile', 'Go to Profile') },
                { keys: ['G', 'S'], chord: true, label: t('shortcuts.go_search', 'Go to Search') },
                { keys: ['/', 'F'], label: t('shortcuts.focus_search', 'Focus search') },
                { keys: ['U'], label: t('shortcuts.open_upload', 'Upload video') },
                { keys: ['?'], label: t('shortcuts.show_shortcuts', 'Show shortcuts') },
            ],
        },
        {
            titleKey: 'shortcuts.player',
            titleDefault: 'Player',
            shortcuts: [
                { keys: ['Space', 'K'], label: t('shortcuts.play_pause', 'Play / Pause') },
                { keys: ['←', '→'], label: t('shortcuts.seek_5s', 'Seek ±5 seconds') },
                { keys: ['↑', '↓'], label: t('shortcuts.volume', 'Volume ±10%') },
                { keys: ['M'], label: t('shortcuts.mute', 'Mute toggle') },
                { keys: ['F'], label: t('shortcuts.fullscreen', 'Fullscreen') },
                { keys: ['T'], label: t('shortcuts.theater_mode', 'Theater mode') },
                { keys: ['I'], label: t('shortcuts.pip', 'Picture in Picture') },
                { keys: ['C'], label: t('shortcuts.captions', 'Captions toggle') },
            ],
            noteKey: 'shortcuts.player_note',
            noteDefault: 'Available when a video is playing',
        },
        {
            titleKey: 'shortcuts.video_page',
            titleDefault: 'Video page',
            shortcuts: [
                { keys: ['L'], label: t('shortcuts.like', 'Like video') },
                { keys: ['S'], label: t('shortcuts.save', 'Save video') },
            ],
            noteKey: 'shortcuts.video_note',
            noteDefault: 'Available only on the video page',
        },
    ];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('shortcuts.title', 'Keyboard shortcuts')} size="md">
            <div className="shortcuts-modal">
                <div className="shortcuts-modal__columns">
                    {SHORTCUT_SECTIONS.map(section => (
                        <section className="shortcuts-modal__section" key={section.titleKey}>
                            <h3 className="shortcuts-modal__section-title">
                                {t(section.titleKey, section.titleDefault)}
                            </h3>
                            <ul className="shortcuts-modal__list" role="list">
                                {section.shortcuts.map(s => (
                                    <li key={s.label} className="shortcuts-modal__item">
                                        <span className="shortcuts-modal__label">{s.label}</span>
                                        <KeyBadge keys={s.keys} chord={s.chord} />
                                    </li>
                                ))}
                            </ul>
                            {section.noteKey && (
                                <p className="shortcuts-modal__note">
                                    {t(section.noteKey, section.noteDefault ?? '')}
                                </p>
                            )}
                        </section>
                    ))}
                </div>

                <p className="shortcuts-modal__tip">
                    {t('shortcuts.tip', 'Chord shortcuts: press G first, then the second key')}
                </p>
            </div>
        </Modal>
    );
}
