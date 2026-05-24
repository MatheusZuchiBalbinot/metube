import { Clock, Flame, Hash } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VideoCard from '@components/video/card';
import { SortBy, type FilterState } from '@utils';
import type { Video, VideoId, Tag, Comment } from '@models';
import type { ProfileSectionsData } from '../hooks/useProfileSections';
import ProfileCoverStory from './ProfileCoverStory';
import ProfileDiamondTiers from './ProfileDiamondTiers';
import ProfileTopicGrid from './ProfileTopicGrid';

interface ProfileSectionsProps {
    sections: ProfileSectionsData
    spotlightComments: Comment[]
    isOwnProfile: boolean
    onNavigate: (id: VideoId) => void
    onWatchClick: (e: React.MouseEvent) => void
    onScrollToFilter: (filter?: Partial<FilterState>) => void
    onEdit: (video: Video) => void
    onDelete: (id: VideoId) => void
}

export default function ProfileSections({
    sections,
    spotlightComments,
    isOwnProfile,
    onNavigate,
    onWatchClick,
    onScrollToFilter,
    onEdit,
    onDelete,
}: ProfileSectionsProps) {
    const { t } = useTranslation();

    return (
        <div className="profile-page__sections">
            {sections.featured !== null && (
                <ProfileCoverStory
                    featured={sections.featured}
                    spotlightComments={spotlightComments}
                    onNavigate={onNavigate}
                    onWatchClick={onWatchClick}
                />
            )}

            {sections.latest.length > 0 && (
                <div className="profile-page__section">
                    <div className="profile-page__section-header">
                        <h3 className="profile-page__section-title">
                            <Clock size={16} strokeWidth={2} />
                            {t('channel.latest_uploads')}
                        </h3>
                        <button
                            type="button"
                            className="profile-page__section-see-all"
                            onClick={() => onScrollToFilter({ sortBy: SortBy.RECENT })}
                        >
                            {t('channel.see_all')}
                        </button>
                    </div>
                    <div className="profile-page__latest-grid">
                        {sections.latest.map(video => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                showActions={isOwnProfile}
                                onEdit={onEdit}
                                onDelete={onDelete}
                            />
                        ))}
                    </div>
                </div>
            )}

            {sections.mostViewed.length >= 1 && (
                <div className="profile-page__section">
                    <div className="profile-page__section-header">
                        <h3 className="profile-page__section-title">
                            <Flame size={16} strokeWidth={2} />
                            {t('channel.top_videos')}
                        </h3>
                        <button
                            type="button"
                            className="profile-page__section-see-all"
                            onClick={() => onScrollToFilter({ sortBy: SortBy.VIEWS })}
                        >
                            {t('channel.see_all')}
                        </button>
                    </div>
                    <ProfileDiamondTiers
                        videos={sections.mostViewed}
                        onNavigate={onNavigate}
                    />
                </div>
            )}

            {sections.tagSections.length > 0 && (
                <div className="profile-page__section">
                    <div className="profile-page__section-header">
                        <h3 className="profile-page__section-title">
                            <Hash size={15} strokeWidth={2.5} />
                            {t('channel.by_topic')}
                        </h3>
                    </div>
                    <ProfileTopicGrid
                        tagSections={sections.tagSections}
                        onSelectTag={(tag: Tag) => onScrollToFilter({ tags: [tag] })}
                    />
                </div>
            )}
        </div>
    );
}
