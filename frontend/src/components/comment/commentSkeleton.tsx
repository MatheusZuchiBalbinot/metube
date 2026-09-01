import Skeleton from '@ui/skeleton/skeleton';
import './commentSkeleton.css';

export default function CommentSkeleton() {
    return (
        <div className="comment-skeleton">
            <Skeleton className="comment-skeleton__avatar" circle />
            <div className="comment-skeleton__body">
                <Skeleton className="comment-skeleton__title" />
                <Skeleton className="comment-skeleton__text" />
            </div>
        </div>
    );
}
