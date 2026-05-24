import { useTranslation } from 'react-i18next';
import type { Tag, Video } from '@models';

interface TagSection {
    tag: Tag
    count: number
    videos: Video[]
}

interface ProfileTopicGridProps {
    tagSections: TagSection[]
    onSelectTag: (tag: Tag) => void
}

export default function ProfileTopicGrid({ tagSections, onSelectTag }: ProfileTopicGridProps) {
    const { t } = useTranslation();

    return (
        <div className="profile-page__topics">
            {tagSections.map(({ tag, count, videos }) => {
                const coverThumb = videos[0]?.thumbnail ?? '';
                return (
                    <div
                        key={tag}
                        className="profile-page__topic-cover"
                        style={{ backgroundImage: `url(${coverThumb})` }}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelectTag(tag)}
                        onKeyDown={e => e.key === 'Enter' && onSelectTag(tag)}
                    >
                        <div className="profile-page__topic-cover-content">
                            <span className="profile-page__topic-cover-tag">#{tag}</span>
                            <span className="profile-page__topic-cover-count">
                                {t('channel.topic_videos', { count })}
                            </span>
                            <div className="profile-page__topic-cover-list">
                                {videos.map(v => (
                                    <span key={v.id} className="profile-page__topic-cover-item">{v.title}</span>
                                ))}
                            </div>
                            <div className="profile-page__topic-cover-footer">
                                <button
                                    type="button"
                                    className="profile-page__topic-cover-see-all"
                                    onClick={e => {
                                        e.stopPropagation();
                                        onSelectTag(tag);
                                    }}
                                >
                                    {t('channel.see_all')} →
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
