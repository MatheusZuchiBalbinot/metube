import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { List, BookOpen, Tv2 } from 'lucide-react';
import VideoRow from '@components/video/row';
import VideoRowSkeleton from '@components/video/rowSkeleton';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import { SidebarTab } from '@enums/sidebarTab';
import { AnalyticsSource } from '@api';
import type { VideoSummary, VideoTranscription } from '@api';
import { VideoFilter, cn, parseChapterTimestamp, renderSummaryMarkdown } from '@utils';
import type { Video } from '@models';
import { Spinner, EmptyState } from '@ui';
import { domain } from '@domain';
import { useAllTags, useSeekFeedback } from '@hooks';

const WAVEFORM_BARS = [0, 1, 2, 3, 4, 5, 6];

interface VideoSidebarProps {
    relatedVideos: Video[]
    loadingRelated: boolean
    summary: VideoSummary | null
    transcription: VideoTranscription | null
    getCurrentTime: () => number
    onSeekToChapter: (seconds: number) => void
    videoRef: React.RefObject<HTMLVideoElement | null>
}

export default function VideoSidebar({
    relatedVideos, loadingRelated, summary, transcription, getCurrentTime, onSeekToChapter, videoRef,
}: VideoSidebarProps) {
    const { t } = useTranslation();
    const hasSummary = summary !== null;
    const isSummaryGenerating = transcription !== null
        && !domain.transcription.isFailed(transcription)
        && !hasSummary;
    const showSummaryTab = hasSummary || isSummaryGenerating;
    const [sidebarTab, setSidebarTab] = useState<SidebarTab>(
        hasSummary ? SidebarTab.SUMMARY : SidebarTab.RELATED,
    );
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);
    const [currentTime, setCurrentTime] = useState(0);
    const { seekingIndex, seekToIndex } = useSeekFeedback(videoRef);
    const autoSwitchedRef = useRef(false);

    // Auto-switch to Summary tab once when a transcription/summary process appears.
    // Uses a ref so the user can freely switch back to Related without being forced back.
    // Resets when the tab disappears (e.g. navigating to another video) so the
    // next video's summary re-triggers the auto-switch.
    useEffect(() => {
        if (showSummaryTab && !autoSwitchedRef.current) {
            autoSwitchedRef.current = true;
            setSidebarTab(SidebarTab.SUMMARY);
        } else if (!showSummaryTab) {
            autoSwitchedRef.current = false;
        }
    }, [showSummaryTab]);

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

    const allRelatedTags = useAllTags(relatedVideos);

    const filteredRelated = useMemo(
        () => VideoFilter.apply(relatedVideos, filterState),
        [relatedVideos, filterState],
    );

    const hasKeyPoints = hasSummary && summary.keyPoints.length > 0;
    const hasChapters = hasSummary && summary.chapters.length > 0;
    const hasSummaryProse = hasSummary && summary.readingMode.trim() !== '';

    const summaryHtml = hasSummaryProse ? renderSummaryMarkdown(summary.readingMode) : '';

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

                {showSummaryTab && (
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

                <div className="video-page__sidebar-filter-slot" aria-hidden={sidebarTab !== SidebarTab.RELATED || undefined} style={sidebarTab !== SidebarTab.RELATED ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
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
                    {loadingRelated && Array.from({ length: 5 }).map((_, i) => (
                        <VideoRowSkeleton key={i} />
                    ))}
                    {!loadingRelated && filteredRelated.map((v, idx) => (
                        <VideoRow key={v.id} video={v} source={AnalyticsSource.RECOMMENDED} position={idx} />
                    ))}
                    {!loadingRelated && filteredRelated.length === 0 && (
                        <EmptyState
                            icon={<Tv2 size={32} strokeWidth={1.5} />}
                            title={relatedVideos.length === 0 ? t('video.related_empty') : t('video.related_filtered_empty')}
                            description={relatedVideos.length === 0 ? t('video.related_empty_desc') : undefined}
                        />
                    )}
                </div>
            )}

            {sidebarTab === SidebarTab.SUMMARY && showSummaryTab && (
                <div className="video-page__summary">
                    {isSummaryGenerating && (
                        <div className="video-page__transcription-processing">
                            <div className="video-page__transcription-waveform" aria-hidden="true">
                                {WAVEFORM_BARS.map(i => (
                                    <span
                                        key={i}
                                        className="video-page__transcription-waveform-bar"
                                        style={{ animationDelay: `${i * 0.14}s` }}
                                    />
                                ))}
                            </div>
                            <h3 className="video-page__transcription-processing-title">
                                {t('video.summary_processing_title')}
                            </h3>
                            <p className="video-page__transcription-processing-sub">
                                {t('video.summary_processing_sub')}
                            </p>
                        </div>
                    )}
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
                                                onClick={() => seekToIndex(i, () => onSeekToChapter(seconds))}
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
