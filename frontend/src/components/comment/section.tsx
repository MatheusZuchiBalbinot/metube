import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Spinner } from '@ui';
import { useComments } from '@hooks/useComments';
import CommentForm from './form';
import CommentItem from './item';
import type { Vuid } from '@api/videos';
import './section.css';

interface CommentSectionProps {
    vuid: Vuid
}

export default function CommentSection({ vuid }: CommentSectionProps) {
    const { t } = useTranslation();
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
        <div className="comment-section">
            <h3 className="comment-section__title">
                {t('comments.title', { count: total })}
            </h3>

            <div className="comment-section__form">
                <CommentForm onSubmit={content => add(content)} />
            </div>

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
                            key={comment.id as string}
                            comment={comment}
                            onToggleLike={toggleLike}
                            onEdit={edit}
                            onDelete={remove}
                            onAddReply={(content, parentCuid) => add(content, parentCuid)}
                            getReplies={getReplies}
                            onLoadReplies={loadReplies}
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
        </div>
    );
}
