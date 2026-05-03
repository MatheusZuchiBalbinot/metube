import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Pencil, Trash2 } from 'lucide-react';
import { Avatar, Button, Tooltip } from '@ui';
import { Format } from '@utils/format';
import { useAuth } from '@hooks/useAuth';
import CommentForm from './form';
import type { Comment } from '@models/comment';
import type { Cuid } from '@api/comments';
import './replies.css';

interface CommentRepliesProps {
    parentCuid: Cuid
    getReplies: (cuid: Cuid) => Comment[]
    onToggleLike: (cuid: Cuid) => Promise<void>
    onEdit: (cuid: Cuid, content: string) => Promise<void>
    onDelete: (cuid: Cuid, parentCuid?: Cuid) => Promise<void>
}

export default function CommentReplies({
    parentCuid,
    getReplies,
    onToggleLike,
    onEdit,
    onDelete,
}: CommentRepliesProps) {
    const replies = getReplies(parentCuid);

    return (
        <div className="comment-replies">
            {replies.map(reply => (
                <ReplyItem
                    key={reply.id as string}
                    reply={reply}
                    onToggleLike={onToggleLike}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}

interface ReplyItemProps {
    reply: Comment
    onToggleLike: (cuid: Cuid) => Promise<void>
    onEdit: (cuid: Cuid, content: string) => Promise<void>
    onDelete: (cuid: Cuid, parentCuid?: Cuid) => Promise<void>
}

function ReplyItem({ reply, onToggleLike, onEdit, onDelete }: ReplyItemProps) {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);

    const isOwner = user !== null && (user.id as unknown as string) === reply.author.uuid;

    async function handleEdit(content: string) {
        await onEdit(reply.id, content);
        setIsEditing(false);
    }

    async function handleDelete() {
        const isConfirmed = window.confirm(t('comments.delete_confirm'));

        if (!isConfirmed) {
            return;
        }

        await onDelete(reply.id, reply.parentCuid);
    }

    return (
        <div className="comment-replies__item">
            <div className="comment-replies__avatar">
                <Avatar name={reply.author.name} src={reply.author.avatar} size="sm" />
            </div>

            <div className="comment-replies__body">
                <div className="comment-replies__header">
                    <span className="comment-replies__author">{reply.author.name}</span>
                    <span className="comment-replies__time">
                        {Format.relativeDate(reply.createdAt, i18n.language)}
                    </span>
                    {reply.updatedAt !== undefined && (
                        <span className="comment-replies__edited">{t('comments.edited')}</span>
                    )}
                </div>

                {isEditing ? (
                    <CommentForm
                        initialValue={reply.content}
                        submitLabel={t('common.save')}
                        onSubmit={handleEdit}
                        onCancel={() => setIsEditing(false)}
                    />
                ) : (
                    <p className="comment-replies__content">{reply.content}</p>
                )}

                <div className="comment-replies__actions">
                    <Tooltip
                        content={reply.isLiked ? t('comments.unlike') : t('comments.like')}
                        side="top"
                    >
                        <button
                            className={[
                                'comment-replies__like-btn',
                                reply.isLiked ? 'comment-replies__like-btn--active' : '',
                            ].filter(Boolean).join(' ')}
                            onClick={() => {
                                void onToggleLike(reply.id);
                            }}
                            aria-pressed={reply.isLiked}
                            aria-label={reply.isLiked ? t('comments.unlike') : t('comments.like')}
                        >
                            <ThumbsUp size={14} />
                            {reply.likesCount > 0 && (
                                <span className="comment-replies__like-count">{reply.likesCount}</span>
                            )}
                        </button>
                    </Tooltip>

                    {isOwner && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsEditing(v => !v)}
                                aria-label={t('comments.edit')}
                            >
                                <Pencil size={14} />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    void handleDelete();
                                }}
                                aria-label={t('comments.delete')}
                            >
                                <Trash2 size={14} />
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
