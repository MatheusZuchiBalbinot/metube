import { PictureInPicture2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Tooltip from '@ui/tooltip/tooltip';

interface PipButtonProps {
    isActive: boolean
    isSupported: boolean
    onClick: (e: React.MouseEvent) => void
}

export default function PipButton({ isActive, isSupported, onClick }: PipButtonProps) {
    const { t } = useTranslation();

    const isNotSupported = !isSupported;
    if (isNotSupported) {
        return null;
    }

    return (
        <Tooltip content={isActive ? t('player.exit_pip') : t('player.pip')} side="top">
            <button
                className="vp__btn"
                onClick={onClick}
                aria-label={isActive ? t('player.exit_pip') : t('player.pip')}
                aria-pressed={isActive}
            >
                <PictureInPicture2 size={16} />
            </button>
        </Tooltip>
    );
}
