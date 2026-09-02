import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, Pencil, Trash2, Reply, ChevronDown, ChevronUp } from '@components/icons/icons';
import { Avatar, Button, Modal, Spinner, Tooltip } from '@ui';
import CommentForm from './form';
import CommentHistory from './history';
import CommentReplies from './replies';
import TimestampedText from '@components/ui/timestamp/text';
import type { Comment, CommentVersion } from '@models';
import type { Cuid } from '@api';
import './item.css';
import { useAuth } from '@hooks';
import { formatRelativeDate, ROUTES, cn } from '@utils';
import { domain } from '@domain';

interface CommentItemProps {
    comment: Comment
    videoChannelId?: string
    loadingReplies: Record<string, boolean>
    onToggleLike: (cuid: Cuid) => Promise<void>
    onEdit: (cuid: Cuid, content: string) => Promise<void>
    onDelete: (cuid: Cuid, parentCuid?: Cuid) => Promise<void>
    onAddReply: (content: string, parentCuid: Cuid) => Promise<void>
    getReplies: (cuid: Cuid) => Comment[]
    onLoadReplies: (cuid: Cuid) => Promise<void>
    onSeek?: (seconds: number) => void
}

function resolveCommentPermissions(
    comment: Comment,
    user: ReturnType<typeof useAuth>['user'],
    videoChannelId?: string,
): { canEdit: boolean; canDelete: boolean } {
    const canEdit = user !== null && domain.comment.canEdit(comment, user);
    const canDelete = user !== null && (
        videoChannelId !== undefined
            ? domain.comment.canDelete(comment, user, videoChannelId)
            : domain.comment.isOwnComment(comment, user)
    );

    return { canEdit, canDelete };
}

type Translate = (key: string, opts?: Record<string, unknown>) => string;

interface CommentItemHeaderProps {
    comment: Comment
    language: string
    viewingVersion: CommentVersion | null
    onVersionSelect: (version: CommentVersion | null) => void
    t: Translate
}

function CommentItemHeader({ comment, language, viewingVersion, onVersionSelect, t }: CommentItemHeaderProps) {
    return (
        <div className="comment-item__header">
            <Link
                to={ROUTES.USER.replace(':id', comment.author.uuid)}
                className="comment-item__author"
                onClick={e => e.stopPropagation()}
            >
                {comment.author.name}
            </Link>
            <span className="comment-item__time">
                {formatRelativeDate(comment.createdAt, language)}
            </span>
            {comment.isEdited && (
                <CommentHistory
                    cuid={comment.id}
                    selectedVersion={viewingVersion}
                    onVersionSelect={onVersionSelect}
                />
            )}
            {viewingVersion !== null && (
                <button
                    className="comment-item__version-pill"
                    onClick={() => onVersionSelect(null)}
                    title={t('comments.history_view_current')}
                >
                    {t('comments.history_viewing', { n: viewingVersion.version })}
                    <span aria-hidden="true">×</span>
                </button>
            )}
        </div>
    );
}

interface CommentItemLikeButtonProps {
    isLiked: boolean
    likesCount: number
    onToggleLike: () => void
    t: Translate
}

function CommentItemLikeButton({ isLiked, likesCount, onToggleLike, t }: CommentItemLikeButtonProps) {
    const likeClass = cn('comment-item__like-btn', isLiked && 'comment-item__like-btn--active');

    return (
        <Tooltip content={isLiked ? t('comments.unlike') : t('comments.like')} side="top">
            <button
                className={likeClass}
                onClick={onToggleLike}
                aria-pressed={isLiked}
                aria-label={isLiked ? t('comments.unlike') : t('comments.like')}
            >
                <ThumbsUp size={14} />
                {likesCount > 0 && (
                    <span className="comment-item__like-count">{likesCount}</span>
                )}
            </button>
        </Tooltip>
    );
}

interface CommentItemOwnerActionsProps {
    canEdit: boolean
    canDelete: boolean
    onEditClick: () => void
    onDeleteClick: () => void
    t: Translate
}

function CommentItemOwnerActions({ canEdit, canDelete, onEditClick, onDeleteClick, t }: CommentItemOwnerActionsProps) {
    const isVisible = canEdit || canDelete;

    if (!isVisible) {
        return null;
    }

    return (
        <div className="comment-item__owner-actions">
            <span className="comment-item__actions-dot" aria-hidden="true" />
            {canEdit && (
                <Tooltip content={t('comments.edit')} side="top">
                    <button
                        className="comment-item__action-btn"
                        onClick={onEditClick}
                        aria-label={t('comments.edit')}
                    >
                        <Pencil size={13} />
                    </button>
                </Tooltip>
            )}
            {canDelete && (
                <Tooltip content={t('comments.delete')} side="top">
                    <button
                        className="comment-item__action-btn comment-item__action-btn--danger"
                        onClick={onDeleteClick}
                        aria-label={t('comments.delete')}
                    >
                        <Trash2 size={13} />
                    </button>
                </Tooltip>
            )}
        </div>
    );
}

interface CommentItemRepliesToggleProps {
    hasReplies: boolean
    isRepliesLoading: boolean
    showReplies: boolean
    replyCount: number
    onToggle: () => void
    toggleIcon: React.ReactNode
    t: Translate
}

function CommentItemRepliesToggle({
    hasReplies,
    isRepliesLoading,
    showReplies,
    replyCount,
    onToggle,
    toggleIcon,
    t,
}: CommentItemRepliesToggleProps) {
    if (!hasReplies) {
        return null;
    }

    return (
        <button
            className="comment-item__replies-toggle"
            onClick={onToggle}
            disabled={isRepliesLoading}
            aria-expanded={showReplies}
        >
            {toggleIcon}
            {showReplies
                ? t('comments.hide_replies')
                : t('comments.view_replies', { count: replyCount })}
        </button>
    );
}

export default function CommentItem({
    comment,
    videoChannelId,
    loadingReplies,
    onToggleLike,
    onEdit,
    onDelete,
    onAddReply,
    getReplies,
    onLoadReplies,
    onSeek,
}: CommentItemProps) {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isReplying, setIsReplying] = useState(false);
    const [showReplies, setShowReplies] = useState(false);
    const [viewingVersion, setViewingVersion] = useState<CommentVersion | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const displayContent = viewingVersion !== null ? viewingVersion.content : comment.content;
    const { canEdit, canDelete } = resolveCommentPermissions(comment, user, videoChannelId);
    const hasReplies = comment.replyCount > 0;
    const isRepliesLoading = loadingReplies[comment.id] ?? false;

    function getToggleIcon() {
        if (isRepliesLoading && showReplies) {
            return <Spinner size="sm" />;
        }
        return showReplies ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
    }

    async function handleEdit(content: string) {
        await onEdit(comment.id, content);
        setIsEditing(false);
    }

    async function handleConfirmDelete() {
        await onDelete(comment.id, comment.parentCuid);
        setIsDeleteOpen(false);
    }

    function handleCloseDelete() {
        setIsDeleteOpen(false);
    }

    async function handleReply(content: string) {
        await onAddReply(content, comment.id);
        setIsReplying(false);
        setShowReplies(true);
        await onLoadReplies(comment.id);
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
        <div className="comment-item">
            <Avatar name={comment.author.name} src={comment.author.avatar} size="sm" />

            <div className="comment-item__body">
                <CommentItemHeader
                    comment={comment}
                    language={i18n.language}
                    viewingVersion={viewingVersion}
                    onVersionSelect={setViewingVersion}
                    t={t}
                />

                {isEditing ? (
                    <CommentForm
                        initialValue={comment.content}
                        submitLabel={t('common.save')}
                        onSubmit={handleEdit}
                        onCancel={() => setIsEditing(false)}
                    />
                ) : (
                    <p className="comment-item__content">
                        <TimestampedText text={displayContent} onSeek={onSeek} />
                    </p>
                )}

                <div className="comment-item__actions">
                    <CommentItemLikeButton
                        isLiked={comment.isLiked}
                        likesCount={comment.likesCount}
                        onToggleLike={() => {
                            void onToggleLike(comment.id);
                        }}
                        t={t}
                    />

                    <Tooltip content={t('comments.reply')} side="top">
                        <button
                            className="comment-item__action-btn"
                            onClick={() => setIsReplying(v => !v)}
                            aria-label={t('comments.reply')}
                        >
                            <Reply size={14} />
                            <span>{t('comments.reply')}</span>
                        </button>
                    </Tooltip>

                    <CommentItemOwnerActions
                        canEdit={canEdit}
                        canDelete={canDelete}
                        onEditClick={() => setIsEditing(v => !v)}
                        onDeleteClick={() => setIsDeleteOpen(true)}
                        t={t}
                    />
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

                <CommentItemRepliesToggle
                    hasReplies={hasReplies}
                    isRepliesLoading={isRepliesLoading}
                    showReplies={showReplies}
                    replyCount={comment.replyCount}
                    onToggle={() => {
                        void handleToggleReplies();
                    }}
                    toggleIcon={getToggleIcon()}
                    t={t}
                />

                {showReplies && hasReplies && (
                    <CommentReplies
                        parentCuid={comment.id}
                        videoChannelId={videoChannelId}
                        isLoading={isRepliesLoading}
                        getReplies={getReplies}
                        loadingReplies={loadingReplies}
                        onToggleLike={onToggleLike}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onAddReply={onAddReply}
                        onLoadReplies={onLoadReplies}
                        onSeek={onSeek}
                    />
                )}
            </div>

            <Modal
                isOpen={isDeleteOpen}
                onClose={handleCloseDelete}
                title={t('comments.delete')}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" size="md" onClick={handleCloseDelete}>
                            {t('common.cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            size="md"
                            onClick={() => {
                                void handleConfirmDelete();
                            }}
                        >
                            {t('comments.delete')}
                        </Button>
                    </>
                }
            >
                <p>{t('comments.delete_confirm')}</p>
            </Modal>
        </div>
    );
}
