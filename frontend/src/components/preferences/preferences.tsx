import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '@context/useTheme';
import { useVideo } from '@context/useVideo';
import { STORAGE_KEYS } from '@utils/storageKeys';
import { Button, Tooltip } from '@ui';
import { THEME_COLORS, THEME_MODES, LANGUAGES } from '@data/themeConfig';
import './preferences.css';

interface PreferencesPanelProps {
    inline?: boolean;
}

export default function PreferencesPanel({ inline = false }: PreferencesPanelProps) {
    const { t, i18n } = useTranslation();
    const { mode, color, setMode, setColor } = useTheme();
    const { autoplay, setAutoplay } = useVideo();
    const [open, setOpen] = useState(false);

    const currentLang = i18n.language.split('-')[0];

    function changeLanguage(code: string) {
        i18n.changeLanguage(code);
        localStorage.setItem(STORAGE_KEYS.LANGUAGE, code);
    }

    const sections = (
        <>
            {/* Theme */}
            <div className="prefs-section">
                <p className="prefs-label">{t('preferences.theme')}</p>
                <div className="prefs-toggle">
                    {THEME_MODES.map(({ key, labelKey }) => (
                        <Button
                            key={key}
                            variant="ghost"
                            className={`prefs-toggle-btn${mode === key ? ' active' : ''}`}
                            onClick={() => setMode(key)}
                            aria-label={t(labelKey)}
                            aria-pressed={mode === key}
                        >
                            {key === 'dark' ? <Moon size={13} /> : <Sun size={13} />}
                            {t(labelKey)}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Accent color */}
            <div className="prefs-section">
                <p className="prefs-label">{t('preferences.accent_color')}</p>
                <div className="prefs-colors">
                    {THEME_COLORS.map(({ key, hex, label }) => (
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

            {/* Autoplay */}
            <div className="prefs-section">
                <label className="prefs-autoplay-row">
                    <span className="prefs-label">{t('preferences.autoplay')}</span>
                    <button
                        role="switch"
                        aria-checked={autoplay}
                        className={['prefs-autoplay-toggle', autoplay ? 'prefs-autoplay-toggle--on' : ''].filter(Boolean).join(' ')}
                        onClick={() => setAutoplay(!autoplay)}
                        aria-label={t('preferences.autoplay')}
                    >
                        <span className="prefs-autoplay-thumb" />
                    </button>
                </label>
            </div>
        </>
    );

    if (inline) {
        return <>{sections}</>;
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
                        {sections}
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
