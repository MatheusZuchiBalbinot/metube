import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Spinner } from '@ui';
import CommentForm from './form';
import CommentItem from './item';
import type { Vuid } from '@api';
import './section.css';
import { useComments, useAuth } from '@hooks';

interface CommentSectionProps {
    vuid: Vuid
    videoChannelId?: string
    onSeek?: (seconds: number) => void
}

export default function CommentSection({ vuid, videoChannelId, onSeek }: CommentSectionProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const {
        comments,
        isLoading,
        pagination,
        load,
        loadMore,
        add,
        edit,
        remove,
        toggleLike,
        loadReplies,
        loadingReplies,
        getReplies,
    } = useComments(vuid);

    useEffect(() => {
        void load(1);
    }, [load]);

    const hasLoaded = pagination !== undefined;
    const hasMore = hasLoaded && pagination.currentPage < pagination.lastPage;
    const total = pagination?.total ?? 0;
    const isInitialLoading = isLoading || !hasLoaded;
    const isEmpty = hasLoaded && !isLoading && comments.length === 0;

    return (
        <section className="comment-section">
            <h3 className="comment-section__title">
                {t('comments.title', { count: total })}
            </h3>

            <div className="comment-section__input-row">
                {user !== null && (
                    <Avatar name={user.name} src={user.avatar ?? ''} size="sm" />
                )}
                <CommentForm
                    collapsible
                    onSubmit={content => add(content)}
                />
            </div>

            <div className="comment-section__divider" />

            {isInitialLoading && (
                <div className="comment-section__loading">
                    <Spinner size="md" />
                </div>
            )}

            {isEmpty && (
                <p className="comment-section__empty">{t('comments.empty')}</p>
            )}

            {!isInitialLoading && comments.length > 0 && (
                <div className="comment-section__list">
                    {comments.map(comment => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            videoChannelId={videoChannelId}
                            loadingReplies={loadingReplies}
                            onToggleLike={toggleLike}
                            onEdit={edit}
                            onDelete={remove}
                            onAddReply={(content, parentCuid) => add(content, parentCuid)}
                            getReplies={getReplies}
                            onLoadReplies={loadReplies}
                            onSeek={onSeek}
                        />
                    ))}
                </div>
            )}

            {hasMore && (
                <div className="comment-section__more">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            void loadMore();
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? <Spinner size="sm" /> : t('comments.load_more')}
                    </Button>
                </div>
            )}
        </section>
    );
}
