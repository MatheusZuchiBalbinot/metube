import { Spinner } from '@ui';
import CommentItem from './item';
import type { Comment } from '@models/comment';
import type { Cuid } from '@api/comments';
import './replies.css';

interface CommentRepliesProps {
    parentCuid: Cuid
    isLoading?: boolean
    getReplies: (cuid: Cuid) => Comment[]
    loadingReplies: Record<string, boolean>
    onToggleLike: (cuid: Cuid) => Promise<void>
    onEdit: (cuid: Cuid, content: string) => Promise<void>
    onDelete: (cuid: Cuid, parentCuid?: Cuid) => Promise<void>
    onAddReply: (content: string, parentCuid: Cuid) => Promise<void>
    onLoadReplies: (cuid: Cuid) => Promise<void>
}

export default function CommentReplies({
    parentCuid,
    isLoading = false,
    getReplies,
    loadingReplies,
    onToggleLike,
    onEdit,
    onDelete,
    onAddReply,
    onLoadReplies,
}: CommentRepliesProps) {
    const replies = getReplies(parentCuid);

    if (isLoading && replies.length === 0) {
        return (
            <div className="comment-replies comment-replies--loading">
                <Spinner size="sm" />
            </div>
        );
    }

    return (
        <div className="comment-replies">
            {replies.map(reply => (
                <CommentItem
                    key={reply.id}
                    comment={reply}
                    loadingReplies={loadingReplies}
                    onToggleLike={onToggleLike}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddReply={onAddReply}
                    getReplies={getReplies}
                    onLoadReplies={onLoadReplies}
                />
            ))}
        </div>
    );
}
