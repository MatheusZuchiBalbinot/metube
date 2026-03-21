import Skeleton from '@ui/skeleton/skeleton';
import './rowSkeleton.css';

export default function VideoRowSkeleton() {
    return (
        <div className="vr-skeleton" aria-hidden="true">
            <Skeleton className="vr-skeleton__thumb" />
            <div className="vr-skeleton__body">
                <Skeleton className="vr-skeleton__title" />
                <Skeleton className="vr-skeleton__title-short" />
                <Skeleton className="vr-skeleton__description" />
                <Skeleton className="vr-skeleton__meta" />
                <div className="vr-skeleton__tags">
                    <Skeleton className="vr-skeleton__tag" />
                    <Skeleton className="vr-skeleton__tag" />
                </div>
            </div>
        </div>
    );
}
