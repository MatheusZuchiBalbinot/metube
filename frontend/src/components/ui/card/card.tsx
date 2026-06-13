import type { Size } from '../types';
import './card.css';

type CardPadding = 'none' | Size;

interface CardProps {
    children: React.ReactNode
    hover?: boolean
    padding?: CardPadding
    className?: string
    onClick?: () => void
}

export default function Card({
    children,
    hover = false,
    padding = 'md',
    className = '',
    onClick,
}: CardProps) {
    const classes = [
        'card',
        hover ? 'card--hover' : '',
        `card--pad-${padding}`,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const isInteractive = onClick !== undefined;

    function handleKeyDown(e: React.KeyboardEvent) {
        const isActivationKey = e.key === 'Enter' || e.key === ' ';

        if (!isActivationKey || !onClick) {
            return;
        }

        e.preventDefault();
        onClick();
    }

    return (
        // role/tabIndex/keydown make the card a keyboard-operable button when onClick is set; the
        // linter can't tell the role is always paired with the handler, hence the targeted disable.
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions
        <div
            className={classes}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onClick={onClick}
            onKeyDown={isInteractive ? handleKeyDown : undefined}
        >
            {children}
        </div>
    );
}
