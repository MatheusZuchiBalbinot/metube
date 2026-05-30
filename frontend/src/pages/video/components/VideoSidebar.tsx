import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { List, BookOpen } from 'lucide-react';
import DOMPurify from 'dompurify';
import VideoRow from '@components/video/row';
import VideoRowSkeleton from '@components/video/rowSkeleton';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import { SidebarTab } from '@enums/sidebarTab';
import { AnalyticsSource } from '@api';
import type { VideoSummary } from '@api';
import { VideoFilter, cn, parseChapterTimestamp } from '@utils';
import type { Video, Tag } from '@models';
import { Spinner } from '@ui';

interface VideoSidebarProps {
    relatedVideos: Video[]
    loadingRelated: boolean
    summary: VideoSummary | null
    getCurrentTime: () => number
    onSeekToChapter: (seconds: number) => void
    videoRef: React.RefObject<HTMLVideoElement | null>
}

export default function VideoSidebar({
    relatedVideos, loadingRelated, summary, getCurrentTime, onSeekToChapter, videoRef,
}: VideoSidebarProps) {
    const { t } = useTranslation();
    const hasSummary = summary !== null;
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>(
        hasSummary ? SidebarTab.SUMMARY : SidebarTab.RELATED,
    );
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [currentTime, setCurrentTime] = useState(0);
    const [seekingIndex, setSeekingIndex] = useState<number | null>(null);

    useEffect(() => {
        const isOnSummaryTab = sidebarTab === SidebarTab.SUMMARY;

        if (!isOnSummaryTab) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentTime(getCurrentTime());
        }, 1000);

        return () => clearInterval(interval);
    }, [sidebarTab, getCurrentTime]);

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

    const hasKeyPoints = hasSummary && summary.keyPoints.length > 0;
    const hasChapters = hasSummary && summary.chapters.length > 0;
    const hasSummaryProse = hasSummary && summary.readingMode.trim() !== '';

    const summaryHtml = hasSummaryProse
        ? DOMPurify.sanitize(
            summary.readingMode
                .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>'),
        )
        : '';

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

                {hasSummary && (
                    <button
                        role="tab"
                        aria-selected={sidebarTab === SidebarTab.SUMMARY}
                        className={cn('video-page__sidebar-tab', sidebarTab === SidebarTab.SUMMARY && 'video-page__sidebar-tab--active')}
                        onClick={() => setSidebarTab(SidebarTab.SUMMARY)}
                    >
                        <BookOpen size={14} />
                        {t('video.summary')}
                    </button>
                )}

                {sidebarTab === SidebarTab.RELATED && (
                    <div className="video-page__sidebar-filter-slot">
                        <FilterPanel
                            allTags={allRelatedTags}
                            value={filterState}
                            onChange={setFilterState}
                            iconOnly
                        />
                    </div>
                )}
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

            {sidebarTab === SidebarTab.SUMMARY && hasSummary && (
                <div className="video-page__summary">
                    {hasSummaryProse && (
                        <section className="video-page__summary-section">
                            <h3 className="video-page__summary-heading">{t('video.summary')}</h3>
                            <div
                                className="video-page__summary-prose"
                                dangerouslySetInnerHTML={{ __html: summaryHtml }}
                            />
                        </section>
                    )}

                    {hasKeyPoints && (
                        <section className="video-page__summary-section">
                            <h3 className="video-page__summary-heading">{t('video.key_points')}</h3>
                            <ul className="video-page__key-points">
                                {summary.keyPoints.map((point, i) => (
                                    <li key={i} className="video-page__key-point">{point}</li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {hasChapters && (
                        <section className="video-page__summary-section">
                            <h3 className="video-page__summary-heading">{t('video.chapters')}</h3>
                            <ol className="video-page__chapters">
                                {summary.chapters.map((ch, i) => {
                                    const seconds = parseChapterTimestamp(ch.timestamp);
                                    const nextSeconds = summary.chapters[i + 1] !== undefined
                                        ? parseChapterTimestamp(summary.chapters[i + 1].timestamp)
                                        : Infinity;
                                    const isActive = currentTime >= seconds && currentTime < nextSeconds;
                                    const isSeeking = seekingIndex === i;

                                    return (
                                        <li key={i}>
                                            <button
                                                className={cn('video-page__chapter', isActive && 'video-page__chapter--active')}
                                                disabled={isSeeking}
                                                onClick={() => {
                                                    setSeekingIndex(i);
                                                    onSeekToChapter(seconds);
                                                    videoRef.current?.addEventListener('seeked', () => {
                                                        setSeekingIndex(null);
                                                    }, { once: true });
                                                }}
                                            >
                                                {isSeeking
                                                    ? <Spinner size="sm" className="video-page__chapter-spinner" />
                                                    : <span className="video-page__chapter-time">{ch.timestamp}</span>
                                                }
                                                <span className="video-page__chapter-title">{ch.title}</span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ol>
                        </section>
                    )}
                </div>
            )}
        </aside>
    );
}
