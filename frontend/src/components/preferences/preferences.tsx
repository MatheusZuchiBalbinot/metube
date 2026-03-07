import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '@context/useTheme';
import type { ThemeColor, ThemeMode } from '@utils/themes';
import { STORAGE_KEYS } from '@utils/storageKeys';
import { Button, Tooltip } from '@ui';
import './preferences.css';

const COLORS: { key: ThemeColor; hex: string; label: string }[] = [
    { key: 'violet', hex: '#7c3aed', label: 'Violet' },
    { key: 'blue', hex: '#2563eb', label: 'Blue' },
    { key: 'green', hex: '#059669', label: 'Green' },
    { key: 'rose', hex: '#e11d48', label: 'Rose' },
    { key: 'amber', hex: '#d97706', label: 'Amber' },
];

const MODES: { key: ThemeMode; icon: React.ReactNode; labelKey: string }[] = [
    { key: 'dark', icon: <Moon size={13} />, labelKey: 'preferences.dark' },
    { key: 'light', icon: <Sun size={13} />, labelKey: 'preferences.light' },
];

const LANGUAGES = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'pt', label: 'PT', name: 'Português' },
];

export default function PreferencesPanel() {
    const { t, i18n } = useTranslation();
    const { mode, color, setMode, setColor } = useTheme();
    const [open, setOpen] = useState(false);

    const currentLang = i18n.language.split('-')[0];

    function changeLanguage(code: string) {
        i18n.changeLanguage(code);
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, code);
    }

    return (
        <div className="prefs-wrap">
            {open && (
                <>
                    <div className="prefs-backdrop" onClick={() => setOpen(false)} />
                    <div className="prefs-panel">
                        <div className="prefs-header">
                            <span className="prefs-title">{t('preferences.title')}</span>
                            <Tooltip content={t('common.close')} side="bottom">
                                <Button variant="ghost" size="icon" className="prefs-close" onClick={() => setOpen(false)} aria-label={t('common.close')}>
                                    <X size={12} strokeWidth={2.5} />
                                </Button>
                            </Tooltip>
                        </div>

                        {/* Theme */}
                        <div className="prefs-section">
                            <p className="prefs-label">{t('preferences.theme')}</p>
                            <div className="prefs-toggle">
                                {MODES.map(({ key, icon, labelKey }) => (
                                    <Button
                                        key={key}
                                        variant="ghost"
                                        className={`prefs-toggle-btn${mode === key ? ' active' : ''}`}
                                        onClick={() => setMode(key)}
                                        aria-label={t(labelKey)}
                                        aria-pressed={mode === key}
                                    >
                                        {icon}
                                        {t(labelKey)}
                                    </Button>
                                ))}
                            </div>
                        </div>

                        {/* Accent color */}
                        <div className="prefs-section">
                            <p className="prefs-label">{t('preferences.accent_color')}</p>
                            <div className="prefs-colors">
                                {COLORS.map(({ key, hex, label }) => (
                                    <Tooltip key={key} content={label} side="bottom">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className={`prefs-swatch${color === key ? ' selected' : ''}`}
                                            style={{ background: hex }}
                                            onClick={() => setColor(key)}
                                            aria-label={label}
                                            aria-pressed={color === key}
                                        />
                                    </Tooltip>
                                ))}
                            </div>
                        </div>

                        {/* Language */}
                        <div className="prefs-section">
                            <p className="prefs-label">{t('preferences.language')}</p>
                            <div className="prefs-toggle">
                                {LANGUAGES.map(({ code, label, name }) => (
                                    <Button
                                        key={code}
                                        variant="ghost"
                                        className={`prefs-toggle-btn${currentLang === code ? ' active' : ''}`}
                                        onClick={() => changeLanguage(code)}
                                        aria-label={name}
                                        aria-pressed={currentLang === code}
                                        title={name}
                                    >
                                        {label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </>
            )}

            <Tooltip content={t('preferences.title')} side="bottom">
                <Button
                    size="icon"
                    variant="ghost"
                    className={`prefs-trigger${open ? ' open' : ''}`}
                    onClick={() => setOpen(!open)}
                    aria-label={t('preferences.title')}
                >
                    <SlidersHorizontal size={17} strokeWidth={1.8} />
                </Button>
            </Tooltip>
        </div>
    );
}
