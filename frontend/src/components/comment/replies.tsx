import { useTranslation } from 'react-i18next';
import CommentItem from './item';
import CommentSkeleton from './commentSkeleton';
import type { Comment } from '@models';
import type { Cuid } from '@api';
import './replies.css';

interface CommentRepliesProps {
    parentCuid: Cuid
    videoChannelId?: string
    isLoading?: boolean
    getReplies: (cuid: Cuid) => Comment[]
    loadingReplies: Record<string, boolean>
    onToggleLike: (cuid: Cuid) => Promise<void>
    onEdit: (cuid: Cuid, content: string) => Promise<void>
    onDelete: (cuid: Cuid, parentCuid?: Cuid) => Promise<void>
    onAddReply: (content: string, parentCuid: Cuid) => Promise<void>
    onLoadReplies: (cuid: Cuid) => Promise<void>
    onSeek?: (seconds: number) => void
}

export default function CommentReplies({
    parentCuid,
    videoChannelId,
    isLoading = false,
    getReplies,
    loadingReplies,
    onToggleLike,
    onEdit,
    onDelete,
    onAddReply,
    onLoadReplies,
    onSeek,
}: CommentRepliesProps) {
    const { t } = useTranslation();
    const replies = getReplies(parentCuid);

    if (isLoading && replies.length === 0) {
        return (
            <div className="comment-replies" role="status" aria-label={t('common.loading')}>
                <CommentSkeleton />
                <CommentSkeleton />
            </div>
        );
    }

    return (
        <div className="comment-replies">
            {replies.map(reply => (
                <CommentItem
                    key={reply.id}
                    comment={reply}
                    videoChannelId={videoChannelId}
                    loadingReplies={loadingReplies}
                    onToggleLike={onToggleLike}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddReply={onAddReply}
                    getReplies={getReplies}
                    onLoadReplies={onLoadReplies}
                    onSeek={onSeek}
                />
            ))}
        </div>
    );
}
