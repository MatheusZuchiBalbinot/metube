import { Avatar } from '@ui';
import TagBadge from '@components/tag/badge';
import type { Tag } from '@models';
import { Format } from '@utils';
import type { useVideo } from '@hooks';

interface ShortsOverlayProps {
    video: ReturnType<typeof useVideo>['videos'][number];
    visibleTags: Tag[];
    onTagClick: (e: React.MouseEvent | React.KeyboardEvent, tag: Tag) => void;
    onChannelClick: (e: React.MouseEvent) => void;
}

export default function ShortsOverlay({ video, visibleTags, onTagClick, onChannelClick }: ShortsOverlayProps) {
    return (
        <div className="shorts-page__overlay">
            <button
                className="shorts-page__channel"
                onClick={onChannelClick}
                aria-label={video.channel}
            >
                <Avatar name={video.channel} size="sm" />
                <span className="shorts-page__channel-name">{video.channel}</span>
                <span className="shorts-page__views">{Format.views(video.views)} views</span>
            </button>

            <p className="shorts-page__title">{video.title}</p>

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
    );
}
