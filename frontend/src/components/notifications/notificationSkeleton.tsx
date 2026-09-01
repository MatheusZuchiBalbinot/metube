import Skeleton from '@ui/skeleton/skeleton';
import './notificationSkeleton.css';

export default function NotificationSkeleton() {
    return (
        <div className="notification-skeleton">
            <Skeleton className="notification-skeleton__avatar" circle />
            <div className="notification-skeleton__body">
                <Skeleton className="notification-skeleton__title" />
                <Skeleton className="notification-skeleton__text" />
            </div>
        </div>
    );
}
