import Skeleton from '@ui/skeleton/skeleton';
import './cardSkeleton.css';

export default function VideoCardSkeleton() {
    return (
        <div className="vc-skeleton">
            <Skeleton className="vc-skeleton__thumb" />
            <div className="vc-skeleton__body">
                <Skeleton className="vc-skeleton__title" />
                <Skeleton className="vc-skeleton__title-short" />
                <Skeleton className="vc-skeleton__meta" />
                <div className="vc-skeleton__tags">
                    <Skeleton className="vc-skeleton__tag" />
                    <Skeleton className="vc-skeleton__tag" />
                </div>
            </div>
        </div>
    );
}
