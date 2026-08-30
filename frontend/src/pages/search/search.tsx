import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import VideoRow from '@components/video/row';
import FilterPanel, { type FilterState } from '@components/filter/panel';
import { Button } from '@ui';
import EmptyState from '@ui/empty/empty';
import { analytics, AnalyticsSource } from '@api';
import './search.css';
import { useVideoData, useAllTags } from '@hooks';
import { VideoFilter, getSessionId } from '@utils';

// Estimated height of a VideoRow (px). The virtualizer uses this as a first
// approximation; actual heights are measured after render via measureElement.
const VIDEO_ROW_ESTIMATED_HEIGHT = 136;

function HighlightedText({ text, query }: { text: string; query: string }) {
    const isQueryEmpty = query.trim() === '';
    if (isQueryEmpty) {
        return <>{text}</>;
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return (
        <>
            {parts.map((part, i) => {
                const isMatch = part.toLowerCase() === query.toLowerCase();
                return isMatch
                    ? <mark key={i}>{part}</mark>
                    : <span key={i}>{part}</span>;
            })}
        </>
    );
}

// Query/URL sync, virtualized results and the query-vs-no-query / results-vs-empty JSX
// states all live together here; the branching is inherent to those view states.
// eslint-disable-next-line complexity
export default function SearchPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { publishedVideos } = useVideoData();
    const query = searchParams.get('q') ?? '';
    const [localQuery, setLocalQuery] = useState(query);
    const [filters, setFilters] = useState<FilterState>(VideoFilter.emptyState());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- sync editable input from the URL query param
        setLocalQuery(query);
    }, [query]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const baseResults = useMemo(() => {
        const isQueryEmpty = query.trim() === '';
        if (isQueryEmpty) {
            return publishedVideos;
        }

        const queryLower = query.toLowerCase();
        return publishedVideos.filter(video => {
            const matchesTitle = video.title.toLowerCase().includes(queryLower);
            const matchesDesc = video.description.toLowerCase().includes(queryLower);
            const matchesChannel = video.channel.toLowerCase().includes(queryLower);
            const matchesTags = video.tags.some(tag => tag.toLowerCase().includes(queryLower));
            return matchesTitle || matchesDesc || matchesChannel || matchesTags;
        });
    }, [publishedVideos, query]);

    const allTags = useAllTags(baseResults);

    const results = useMemo(
        () => VideoFilter.apply(baseResults, filters),
        [baseResults, filters],
    );

    const hasResults = results.length > 0;
    const hasQuery = query.trim() !== '';

    useEffect(() => {
        if (!hasQuery) {
            return;
        }
        analytics.search({
            query,
            resultCount: results.length,
            sessionId: getSessionId(),
        }).catch(() => {});
    }, [query, hasQuery, results.length]);

    const listRef = useRef<HTMLDivElement>(null);

    /* eslint-disable react-hooks/refs */
    const virtualizer = useWindowVirtualizer({
        count: hasResults ? results.length : 0,
        estimateSize: () => VIDEO_ROW_ESTIMATED_HEIGHT,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });
    /* eslint-enable react-hooks/refs */

    function handleSearchSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
        e.preventDefault();
        const trimmed = localQuery.trim();
        const hasValue = trimmed.length > 0;
        if (!hasValue) {
            return;
        }
        setSearchParams({ q: trimmed });
    }

    return (
        <div className="search-page">
            <div className="search-page__hero">
                <form className="search-page__form" onSubmit={handleSearchSubmit}>
                    <div className="search-page__input-wrap">
                        <button
                            type="submit"
                            className="search-page__input-icon-btn"
                            aria-label={t('search.submit', 'Search')}
                        >
                            <Search size={20} className="search-page__input-icon" aria-hidden="true" />
                        </button>
                        <label htmlFor="search-page-input" className="sr-only">
                            {t('search.label', 'Search')}
                        </label>
                        <input
                            id="search-page-input"
                            ref={inputRef}
                            type="text"
                            className="search-page__input"
                            value={localQuery}
                            onChange={e => setLocalQuery(e.target.value)}
                            placeholder={t('search.placeholder', 'Search videos, channels, tags...')}
                            autoComplete="off"
                        />
                        {localQuery.length > 0 && (
                            <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                className="search-page__submit-btn"
                            >
                                {t('search.go', 'Search')}
                            </Button>
                        )}
                    </div>
                </form>
            </div>

            <div className="search-page__header">
                {hasQuery ? (
                    <>
                        <p className="search-page__results-label">
                            {t('video.results_for_query', { count: results.length })}
                        </p>
                        <span className="search-page__query">
                            &ldquo;<HighlightedText text={query} query={query} />&rdquo;
                        </span>
                    </>
                ) : (
                    <h1 className="search-page__title">{t('video.search_placeholder')}</h1>
                )}
            </div>

            {hasResults && (
                <div className="search-page__filters">
                    <FilterPanel allTags={allTags} value={filters} onChange={setFilters} />
                </div>
            )}

            {hasResults ? (
                <div className="search-page__list" ref={listRef}>
                    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                        {virtualizer.getVirtualItems().map(virtualItem => {
                            const video = results[virtualItem.index];
                            return (
                                <div
                                    key={virtualItem.key}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    className="search-page__item"
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                                    }}
                                >
                                    <VideoRow video={video} source={AnalyticsSource.SEARCH} position={virtualItem.index} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <EmptyState
                    icon={<Search size={40} strokeWidth={1.25} />}
                    title={t('video.no_results')}
                    description={t('search.try_different')}
                />
            )}
        </div>
    );
}
