import { Tooltip } from '@ui';
import { cn } from '@utils';

interface ReactionBtnProps {
    isActive: boolean
    isAnimating?: boolean
    icon: React.ReactNode
    iconActive: React.ReactNode
    label: string
    activeLabel?: string
    className: string
    activeClass: string
    tooltipSide?: 'top' | 'right' | 'bottom' | 'left'
    onClick: () => void
}

export default function ReactionBtn({
    isActive,
    isAnimating,
    icon,
    iconActive,
    label,
    activeLabel,
    className,
    activeClass,
    tooltipSide = 'top',
    onClick,
}: ReactionBtnProps) {
    const tooltipText = isActive && activeLabel ? activeLabel : label;

    const btnClass = cn(className, isActive && activeClass);

    return (
        <Tooltip content={tooltipText} side={tooltipSide}>
            <button
                className={btnClass}
                onClick={onClick}
                aria-pressed={isActive}
                aria-label={tooltipText}
                data-animating={isAnimating ? 'true' : undefined}
            >
                <span className="rbtn__icon">
                    {isActive ? iconActive : icon}
                </span>
                <span className="rbtn__label">{label}</span>
            </button>
        </Tooltip>
    );
}
