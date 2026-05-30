import { useState } from 'react';
import { Clock, Flame, Hash, LayoutList, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VideoCard from '@components/video/card';
import { SortBy, Format, type FilterState } from '@utils';
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
    latestRef?: React.RefObject<HTMLDivElement | null>
    mostViewedRef?: React.RefObject<HTMLDivElement | null>
    topicRef?: React.RefObject<HTMLDivElement | null>
}

type MostViewedLayout = 'diamond' | 'list';

export default function ProfileSections({
    sections,
    spotlightComments,
    isOwnProfile,
    onNavigate,
    onWatchClick,
    onScrollToFilter,
    onEdit,
    onDelete,
    latestRef,
    mostViewedRef,
    topicRef,
}: ProfileSectionsProps) {
    const { t } = useTranslation();
    const [mostViewedLayout, setMostViewedLayout] = useState<MostViewedLayout>('diamond');

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
                <div ref={latestRef} className="profile-page__section">
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
                    <div className="profile-page__latest-carousel">
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
                <div ref={mostViewedRef} className="profile-page__section">
                    <div className="profile-page__section-header">
                        <h3 className="profile-page__section-title">
                            <Flame size={16} strokeWidth={2} />
                            {t('channel.top_videos')}
                        </h3>
                        <div className="profile-page__section-header-actions">
                            <button
                                type="button"
                                className="profile-page__layout-toggle"
                                title={mostViewedLayout === 'diamond' ? t('profile.view_list') : t('profile.view_diamond')}
                                onClick={() => setMostViewedLayout(l => l === 'diamond' ? 'list' : 'diamond')}
                            >
                                {mostViewedLayout === 'diamond' ? <LayoutList size={15} /> : <Layers size={15} />}
                            </button>
                            <button
                                type="button"
                                className="profile-page__section-see-all"
                                onClick={() => onScrollToFilter({ sortBy: SortBy.VIEWS })}
                            >
                                {t('channel.see_all')}
                            </button>
                        </div>
                    </div>

                    {mostViewedLayout === 'diamond' ? (
                        <ProfileDiamondTiers
                            videos={sections.mostViewed}
                            onNavigate={onNavigate}
                        />
                    ) : (
                        <ol className="profile-page__most-viewed-list">
                            {sections.mostViewed.map((video, i) => (
                                <li key={video.id}>
                                    <button
                                        type="button"
                                        className="profile-page__most-viewed-item"
                                        onClick={() => onNavigate(video.id)}
                                    >
                                        <span className="profile-page__most-viewed-rank">#{i + 1}</span>
                                        {video.thumbnail && (
                                            <img
                                                className="profile-page__most-viewed-thumb"
                                                src={video.thumbnail}
                                                alt=""
                                                aria-hidden="true"
                                            />
                                        )}
                                        <span className="profile-page__most-viewed-info">
                                            <span className="profile-page__most-viewed-title">{video.title}</span>
                                            <span className="profile-page__most-viewed-views">{Format.views(video.views)}</span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ol>
                    )}
                </div>
            )}

            {sections.tagSections.length > 0 && (
                <div ref={topicRef} className="profile-page__section">
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
