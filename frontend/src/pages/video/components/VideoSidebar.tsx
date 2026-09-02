import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { List, BookOpen, Tv2 } from '@components/icons/icons';
import VideoRow from '@components/video/row';
import VideoRowSkeleton from '@components/video/rowSkeleton';
import FilterPanel from '@components/filter/panel';
import type { FilterState } from '@components/filter/panel';
import { SidebarTab } from '@enums/sidebarTab';
import { AnalyticsSource } from '@api';
import type { VideoSummary, VideoTranscription } from '@api';
import { VideoFilter, cn, parseChapterTimestamp, renderSummaryMarkdown } from '@utils';
import type { Video, Tag } from '@models';
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

interface SidebarTabsBarProps {
    sidebarTab: SidebarTab
    onSelectTab: (tab: SidebarTab) => void
    showSummaryTab: boolean
    allRelatedTags: Tag[]
    filterState: FilterState
    onFilterChange: (next: FilterState) => void
}

function SidebarTabsBar({ sidebarTab, onSelectTab, showSummaryTab, allRelatedTags, filterState, onFilterChange }: SidebarTabsBarProps) {
    const { t } = useTranslation();
    const isRelatedActive = sidebarTab === SidebarTab.RELATED;

    return (
        <div className="video-page__sidebar-tabs" role="tablist">
            <button
                role="tab"
                aria-selected={isRelatedActive}
                className={cn('video-page__sidebar-tab', isRelatedActive && 'video-page__sidebar-tab--active')}
                onClick={() => onSelectTab(SidebarTab.RELATED)}
            >
                <List size={14} />
                {t('video.related')}
            </button>

            {showSummaryTab && (
                <button
                    role="tab"
                    aria-selected={sidebarTab === SidebarTab.SUMMARY}
                    className={cn('video-page__sidebar-tab', sidebarTab === SidebarTab.SUMMARY && 'video-page__sidebar-tab--active')}
                    onClick={() => onSelectTab(SidebarTab.SUMMARY)}
                >
                    <BookOpen size={14} />
                    {t('video.summary')}
                </button>
            )}

            <div
                className="video-page__sidebar-filter-slot"
                aria-hidden={!isRelatedActive || undefined}
                style={!isRelatedActive ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}
            >
                <FilterPanel
                    allTags={allRelatedTags}
                    value={filterState}
                    onChange={onFilterChange}
                    iconOnly
                />
            </div>
        </div>
    );
}

interface RelatedPanelProps {
    loadingRelated: boolean
    filteredRelated: Video[]
    relatedVideos: Video[]
}

function RelatedPanel({ loadingRelated, filteredRelated, relatedVideos }: RelatedPanelProps) {
    const { t } = useTranslation();
    const isEmpty = !loadingRelated && filteredRelated.length === 0;

    return (
        <div className="video-page__sidebar-list video-page__sidebar-panel">
            {loadingRelated && Array.from({ length: 5 }).map((_, i) => (
                <VideoRowSkeleton key={i} />
            ))}
            {!loadingRelated && filteredRelated.map((v, idx) => (
                <VideoRow key={v.id} video={v} source={AnalyticsSource.RECOMMENDED} position={idx} />
            ))}
            {isEmpty && (
                <EmptyState
                    icon={<Tv2 size={32} strokeWidth={1.5} />}
                    title={relatedVideos.length === 0 ? t('video.related_empty') : t('video.related_filtered_empty')}
                    description={relatedVideos.length === 0 ? t('video.related_empty_desc') : undefined}
                />
            )}
        </div>
    );
}

function SummaryProcessing() {
    const { t } = useTranslation();

    return (
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
    );
}

interface ChaptersSectionProps {
    summary: VideoSummary
    currentTime: number
    seekingIndex: number | null
    seekToIndex: (index: number, onSeek: () => void) => void
    onSeekToChapter: (seconds: number) => void
    setCurrentTime: (seconds: number) => void
}

function ChaptersSection({ summary, currentTime, seekingIndex, seekToIndex, onSeekToChapter, setCurrentTime }: ChaptersSectionProps) {
    const { t } = useTranslation();

    return (
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
                                onClick={() => seekToIndex(i, () => {
                                    onSeekToChapter(seconds);
                                    // Don't wait for the next 1s poll — highlight the
                                    // clicked chapter the moment the seek is issued.
                                    setCurrentTime(seconds);
                                })}
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
    );
}

interface SummaryPanelProps {
    isSummaryGenerating: boolean
    summary: VideoSummary | null
    currentTime: number
    seekingIndex: number | null
    seekToIndex: (index: number, onSeek: () => void) => void
    onSeekToChapter: (seconds: number) => void
    setCurrentTime: (seconds: number) => void
}

function SummaryPanel({
    isSummaryGenerating, summary, currentTime, seekingIndex, seekToIndex, onSeekToChapter, setCurrentTime,
}: SummaryPanelProps) {
    const { t } = useTranslation();

    if (summary === null) {
        return (
            <div className="video-page__summary video-page__sidebar-panel">
                {isSummaryGenerating && <SummaryProcessing />}
            </div>
        );
    }

    const hasSummaryProse = summary.readingMode.trim() !== '';
    const hasKeyPoints = summary.keyPoints.length > 0;
    const hasChapters = summary.chapters.length > 0;
    const summaryHtml = hasSummaryProse ? renderSummaryMarkdown(summary.readingMode) : '';

    return (
        <div className="video-page__summary video-page__sidebar-panel">
            {isSummaryGenerating && <SummaryProcessing />}

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
                <ChaptersSection
                    summary={summary}
                    currentTime={currentTime}
                    seekingIndex={seekingIndex}
                    seekToIndex={seekToIndex}
                    onSeekToChapter={onSeekToChapter}
                    setCurrentTime={setCurrentTime}
                />
            )}
        </div>
    );
}

export default function VideoSidebar({
    relatedVideos, loadingRelated, summary, transcription, getCurrentTime, onSeekToChapter, videoRef,
}: VideoSidebarProps) {
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

    // getCurrentTime is a new closure every render (it reads through refs in
    // useVideoProgress, not memoized), so it can't sit in this effect's deps —
    // during playback the parent re-renders faster than the 1s tick, so the
    // interval would be torn down and recreated before it ever fired, and
    // "currentTime" (and every chapter's active state) would never update.
    const getCurrentTimeRef = useRef(getCurrentTime);
    useLayoutEffect(() => {
        getCurrentTimeRef.current = getCurrentTime;
    });

    useEffect(() => {
        const isOnSummaryTab = sidebarTab === SidebarTab.SUMMARY;

        if (!isOnSummaryTab) {
            return;
        }

        const interval = setInterval(() => {
            setCurrentTime(getCurrentTimeRef.current());
        }, 1000);

        return () => clearInterval(interval);
    }, [sidebarTab]);

    const allRelatedTags = useAllTags(relatedVideos);

    const filteredRelated = useMemo(
        () => VideoFilter.apply(relatedVideos, filterState),
        [relatedVideos, filterState],
    );

    return (
        <aside className="video-page__sidebar">
            <SidebarTabsBar
                sidebarTab={sidebarTab}
                onSelectTab={setSidebarTab}
                showSummaryTab={showSummaryTab}
                allRelatedTags={allRelatedTags}
                filterState={filterState}
                onFilterChange={setFilterState}
            />

            {sidebarTab === SidebarTab.RELATED && (
                <RelatedPanel loadingRelated={loadingRelated} filteredRelated={filteredRelated} relatedVideos={relatedVideos} />
            )}

            {sidebarTab === SidebarTab.SUMMARY && showSummaryTab && (
                <SummaryPanel
                    isSummaryGenerating={isSummaryGenerating}
                    summary={summary}
                    currentTime={currentTime}
                    seekingIndex={seekingIndex}
                    seekToIndex={seekToIndex}
                    onSeekToChapter={onSeekToChapter}
                    setCurrentTime={setCurrentTime}
                />
            )}
        </aside>
    );
}
