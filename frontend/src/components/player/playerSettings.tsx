import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import SettingsPanelBody, { type SettingsPanelBodyProps } from './settingsPanelBody';

interface PlayerSettingsProps extends SettingsPanelBodyProps {
    showSettings: boolean
    settingsRef: React.RefObject<HTMLDivElement | null>
    onToggle: (e: React.MouseEvent) => void
}

export default function PlayerSettings({ showSettings, settingsRef, onToggle, ...bodyProps }: PlayerSettingsProps) {
    const { t } = useTranslation();

    return (
        <div className="vp__settings" ref={settingsRef}>
            {showSettings && <SettingsPanelBody {...bodyProps} />}
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
