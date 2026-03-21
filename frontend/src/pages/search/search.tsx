import { useMemo, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import VideoRow from '@components/video/row';
import { useVideo } from '@context/useVideo';
import { Button } from '@ui';
import './search.css';

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

export default function SearchPage() {
    const { t } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const { publishedVideos } = useVideo();
    const query = searchParams.get('q') ?? '';
    const [localQuery, setLocalQuery] = useState(query);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalQuery(query);
    }, [query]);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const results = useMemo(() => {
        const isQueryEmpty = query.trim() === '';
        if (isQueryEmpty) {
            return publishedVideos;
        }

        const q = query.toLowerCase();
        return publishedVideos.filter(v => {
            const matchesTitle = v.title.toLowerCase().includes(q);
            const matchesDesc = v.description.toLowerCase().includes(q);
            const matchesChannel = v.channel.toLowerCase().includes(q);
            const matchesTags = v.tags.some(tag => tag.toLowerCase().includes(q));
            return matchesTitle || matchesDesc || matchesChannel || matchesTags;
        });
    }, [publishedVideos, query]);

    const hasResults = results.length > 0;
    const hasQuery = query.trim() !== '';

    const listRef = useRef<HTMLDivElement>(null);

    const virtualizer = useWindowVirtualizer({
        count: hasResults ? results.length : 0,
        estimateSize: () => VIDEO_ROW_ESTIMATED_HEIGHT,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });

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
                                    <VideoRow video={video} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="search-page__empty">
                    <Search size={40} strokeWidth={1.25} className="search-page__empty-icon" />
                    <p className="search-page__empty-title">{t('video.no_results')}</p>
                    <p className="search-page__empty-text">{t('search.try_different')}</p>
                </div>
            )}
        </div>
    );
}
