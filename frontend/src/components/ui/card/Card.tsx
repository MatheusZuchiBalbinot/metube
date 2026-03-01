import './Card.css';

type CardPadding = 'none' | 'sm' | 'md' | 'lg';

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

    return (
        <div className={classes} onClick={onClick}>
            {children}
        </div>
    );
}
