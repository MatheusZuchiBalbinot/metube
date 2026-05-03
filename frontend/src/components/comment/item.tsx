import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Pencil, Trash2, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, Button, Tooltip } from '@ui';
import { Format } from '@utils/format';
import { useAuth } from '@hooks/useAuth';
import CommentForm from './form';
import CommentReplies from './replies';
import type { Comment } from '@models/comment';
import type { Cuid } from '@api/comments';
import './item.css';

interface CommentItemProps {
    comment: Comment
    isReply?: boolean
    onToggleLike: (cuid: Cuid) => Promise<void>
    onEdit: (cuid: Cuid, content: string) => Promise<void>
    onDelete: (cuid: Cuid, parentCuid?: Cuid) => Promise<void>
    onAddReply: (content: string, parentCuid: Cuid) => Promise<void>
    getReplies: (cuid: Cuid) => Comment[]
    onLoadReplies: (cuid: Cuid) => Promise<void>
}

export default function CommentItem({
    comment,
    isReply = false,
    onToggleLike,
    onEdit,
    onDelete,
    onAddReply,
    getReplies,
    onLoadReplies,
}: CommentItemProps) {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [showReplies, setShowReplies] = useState(false);

    const isOwner = user !== null && (user.id as unknown as string) === comment.author.uuid;
    const hasReplies = comment.replyCount > 0 && !isReply;

    async function handleEdit(content: string) {
        await onEdit(comment.id, content);
        setIsEditing(false);
    }

    async function handleDelete() {
        const isConfirmed = window.confirm(t('comments.delete_confirm'));

        if (!isConfirmed) {
            return;
        }

        await onDelete(comment.id, comment.parentCuid);
    }

    async function handleReply(content: string) {
        await onAddReply(content, comment.id);
        setIsReplying(false);
    }

    async function handleToggleReplies() {
        const willShow = !showReplies;
        setShowReplies(willShow);

        const replies = getReplies(comment.id);
        const isNotLoaded = replies.length === 0 && comment.replyCount > 0;

        if (willShow && isNotLoaded) {
            await onLoadReplies(comment.id);
        }
    }

    return (
        <div className={['comment-item', isReply ? 'comment-item--reply' : ''].filter(Boolean).join(' ')}>
            <div className="comment-item__avatar">
                <Avatar name={comment.author.name} src={comment.author.avatar} size="sm" />
            </div>

            <div className="comment-item__body">
                <div className="comment-item__header">
                    <span className="comment-item__author">{comment.author.name}</span>
                    <span className="comment-item__time">
                        {Format.relativeDate(comment.createdAt, i18n.language)}
                    </span>
                    {comment.updatedAt !== undefined && (
                        <span className="comment-item__edited">{t('comments.edited')}</span>
                    )}
                </div>

                {isEditing ? (
                    <CommentForm
                        initialValue={comment.content}
                        submitLabel={t('common.save')}
                        onSubmit={handleEdit}
                        onCancel={() => setIsEditing(false)}
                    />
                ) : (
                    <p className="comment-item__content">{comment.content}</p>
                )}

                <div className="comment-item__actions">
                    <Tooltip content={comment.isLiked ? t('comments.unlike') : t('comments.like')} side="top">
                        <button
                            className={['comment-item__like-btn', comment.isLiked ? 'comment-item__like-btn--active' : ''].filter(Boolean).join(' ')}
                            onClick={() => {
                                void onToggleLike(comment.id);
                            }}
                            aria-pressed={comment.isLiked}
                            aria-label={comment.isLiked ? t('comments.unlike') : t('comments.like')}
                        >
                            <ThumbsUp size={14} />
                            {comment.likesCount > 0 && (
                                <span className="comment-item__like-count">{comment.likesCount}</span>
                            )}
                        </button>
                    </Tooltip>

                    {!isReply && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsReplying(v => !v)}
                        >
                            <Reply size={14} />
                            {t('comments.reply')}
                        </Button>
                    )}

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

                {isReplying && (
                    <div className="comment-item__reply-form">
                        <CommentForm
                            placeholder={t('comments.reply_placeholder')}
                            submitLabel={t('comments.reply')}
                            onSubmit={handleReply}
                            onCancel={() => setIsReplying(false)}
                        />
                    </div>
                )}

                {hasReplies && (
                    <button
                        className="comment-item__replies-toggle"
                        onClick={() => {
                            void handleToggleReplies();
                        }}
                    >
                        {showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {showReplies
                            ? t('comments.hide_replies')
                            : t('comments.view_replies', { count: comment.replyCount })}
                    </button>
                )}

                {showReplies && hasReplies && (
                    <CommentReplies
                        parentCuid={comment.id}
                        getReplies={getReplies}
                        onToggleLike={onToggleLike}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                )}
            </div>
        </div>
    );
}
