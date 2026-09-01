import { RectangleHorizontal, Rows2 } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import Tooltip from '@ui/tooltip/tooltip';

interface TheaterButtonProps {
    isTheater: boolean
    onClick: (e: React.MouseEvent) => void
}

export default function TheaterButton({ isTheater, onClick }: TheaterButtonProps) {
    const { t } = useTranslation();
    const label = isTheater ? t('player.exit_theater') : t('player.theater');

    return (
        <Tooltip content={label} side="top">
            <button
                className="vp__btn"
                onClick={onClick}
                aria-label={label}
                aria-pressed={isTheater}
            >
                {isTheater ? <Rows2 size={16} /> : <RectangleHorizontal size={16} />}
            </button>
        </Tooltip>
    );
}
