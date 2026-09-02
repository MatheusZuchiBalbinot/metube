import { Tooltip } from '@ui';
import { cn } from '@utils';

function resolveTooltipText(isActive: boolean, activeLabel: string | undefined, label: string) {
    return isActive && activeLabel ? activeLabel : label;
}

function resolveButtonClass(className: string, isActive: boolean, activeClass: string) {
    return cn(className, isActive && activeClass);
}

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
    showLabel?: boolean
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
    showLabel = true,
    onClick,
}: ReactionBtnProps) {
    const tooltipText = resolveTooltipText(isActive, activeLabel, label);

    const btnClass = resolveButtonClass(className, isActive, activeClass);

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
                {showLabel && <span className="rbtn__label">{label}</span>}
            </button>
        </Tooltip>
    );
}
