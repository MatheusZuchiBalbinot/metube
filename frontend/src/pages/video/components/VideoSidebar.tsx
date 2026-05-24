import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { List } from 'lucide-react';
import VideoRow from '@components/video/row';
import VideoRowSkeleton from '@components/video/rowSkeleton';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import { SidebarTab } from '@enums/sidebarTab';
import { AnalyticsSource } from '@api';
import { VideoFilter, cn } from '@utils';
import type { Video, Tag } from '@models';

interface VideoSidebarProps {
    relatedVideos: Video[]
    loadingRelated: boolean
}

export default function VideoSidebar({ relatedVideos, loadingRelated }: VideoSidebarProps) {
    const { t } = useTranslation();
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>(SidebarTab.RELATED);
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);

    const allRelatedTags = useMemo(() => {
        const tagSet = new Set<Tag>();
        for (const v of relatedVideos) {
            for (const tag of v.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet).sort();
    }, [relatedVideos]);

    const filteredRelated = useMemo(
        () => VideoFilter.apply(relatedVideos, filterState),
        [relatedVideos, filterState],
    );

    return (
        <aside className="video-page__sidebar">
            <div className="video-page__sidebar-tabs" role="tablist">
                <button
                    role="tab"
                    aria-selected={sidebarTab === SidebarTab.RELATED}
                    className={cn('video-page__sidebar-tab', sidebarTab === SidebarTab.RELATED && 'video-page__sidebar-tab--active')}
                    onClick={() => setSidebarTab(SidebarTab.RELATED)}
                >
                    <List size={14} />
                    {t('video.related')}
                </button>
                <div className="video-page__sidebar-filter-slot">
                    <FilterPanel
                        allTags={allRelatedTags}
                        value={filterState}
                        onChange={setFilterState}
                        iconOnly
                    />
                </div>
            </div>

            {sidebarTab === SidebarTab.RELATED && (
                <div className="video-page__sidebar-list">
                    {loadingRelated
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <VideoRowSkeleton key={i} />
                        ))
                        : filteredRelated.map((v, idx) => (
                            <VideoRow key={v.id} video={v} source={AnalyticsSource.RECOMMENDED} position={idx} />
                        ))
                    }
                </div>
            )}
        </aside>
    );
}
