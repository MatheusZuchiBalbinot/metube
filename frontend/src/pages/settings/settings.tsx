import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Keyboard, Palette, UserCog, Info } from '@components/icons/icons';
import { Avatar, Button } from '@ui';
import PreferencesPanel from '@components/preferences/preferences';
import { useAuth } from '@hooks';
import { ROUTES, APP_EVENTS } from '@utils';
import './settings.css';

export default function SettingsPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { hash } = useLocation();

    useEffect(() => {
        if (hash !== '#about') {
            return;
        }

        document.getElementById('about')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [hash]);

    function handleOpenShortcuts() {
        window.dispatchEvent(new CustomEvent(APP_EVENTS.OPEN_SHORTCUTS));
    }

    return (
        <div className="settings-page">
            <h1 className="settings-page__title">{t('settings.title')}</h1>

            {user !== null && (
                <section className="settings-card">
                    <header className="settings-card__header">
                        <UserCog size={18} strokeWidth={1.75} />
                        <h2 className="settings-card__title">{t('settings.account')}</h2>
                    </header>
                    <div className="settings-account">
                        <Avatar name={user.name} src={user.avatar} size="lg" />
                        <div className="settings-account__info">
                            <span className="settings-account__name">{user.name}</span>
                            <span className="settings-account__email">{user.email}</span>
                        </div>
                        <Link to={ROUTES.PROFILE} className="settings-account__link">
                            <Button variant="secondary" size="sm">{t('settings.view_profile')}</Button>
                        </Link>
                    </div>
                </section>
            )}

            <section className="settings-card">
                <header className="settings-card__header">
                    <Palette size={18} strokeWidth={1.75} />
                    <h2 className="settings-card__title">{t('settings.appearance')}</h2>
                </header>
                <PreferencesPanel inline />
            </section>

            <section className="settings-card" id="about">
                <header className="settings-card__header">
                    <Info size={18} strokeWidth={1.75} />
                    <h2 className="settings-card__title">{t('settings.help_about')}</h2>
                </header>
                <div className="settings-about">
                    <p className="settings-about__text">{t('settings.about_text')}</p>
                    <Button variant="secondary" size="sm" leftIcon={<Keyboard size={14} />} onClick={handleOpenShortcuts}>
                        {t('settings.keyboard_shortcuts')}
                    </Button>
                </div>
            </section>
        </div>
    );
}
