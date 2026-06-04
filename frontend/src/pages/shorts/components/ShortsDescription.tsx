import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Avatar } from '@ui';
import TagBadge from '@components/tag/badge';
import type { Tag } from '@models';
import { Format, cn, formatRelativeDate } from '@utils';
import type { useVideo } from '@hooks';

interface ShortsDescriptionProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    visibleTags: Tag[];
    isOpen: boolean;
    onClose: (e: React.MouseEvent) => void;
    onTagClick: (e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => void;
    onChannelClick: (e: React.MouseEvent) => void;
}

export default function ShortsDescription({ video, visibleTags, isOpen, onClose, onTagClick, onChannelClick }: ShortsDescriptionProps) {
    const { t } = useTranslation();

    return (
        <div
            className={cn('shorts-page__desc-panel', isOpen && 'shorts-page__desc-panel--open')}
            role="dialog"
            aria-label={t('shorts.description')}
        >
            <div className="shorts-page__desc-header">
                <span className="shorts-page__desc-title">{t('shorts.description')}</span>
                <button
                    className="shorts-page__desc-close"
                    aria-label={t('common.close')}
                    onClick={onClose}
                >
                    <X size={16} />
                </button>
            </div>
            <div className="shorts-page__desc-body">
                <button
                    className="shorts-page__desc-channel"
                    onClick={onChannelClick}
                    aria-label={video.channel}
                >
                    <Avatar name={video.channel} size="sm" />
                    <span>{video.channel}</span>
                </button>
                <p className="shorts-page__desc-video-title">{video.title}</p>
                {video.description && (
                    <p className="shorts-page__desc-text">{video.description}</p>
                )}
                <p className="shorts-page__desc-meta">
                    {Format.views(video.views)} views · {formatRelativeDate(video.publishedAt, 'en')}
                </p>
                {visibleTags.length > 0 && (
                    <div className="shorts-page__tags">
                        {visibleTags.map(tag => (
                            <TagBadge
                                key={tag}
                                tag={tag}
                                prefix="#"
                                className="shorts-page__tag"
                                onClick={(e: React.MouseEvent | React.KeyboardEvent) => onTagClick(e, tag)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
