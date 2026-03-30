import Button from '../button/button';
import './empty.css';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
    const hasDescription = description !== undefined && description !== '';
    const hasAction = actionLabel !== undefined && onAction !== undefined;

    return (
        <div className="empty-state" role="status" aria-live="polite">
            <div className="empty-state__icon" aria-hidden="true">
                {icon}
            </div>
            <p className="empty-state__title">{title}</p>
            {hasDescription && (
                <p className="empty-state__description">{description}</p>
            )}
            {hasAction && (
                <Button
                    variant="primary"
                    size="sm"
                    onClick={onAction}
                    className="empty-state__action"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
