import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import VideoRow from '@components/video/row';
import { useVideo } from '@context/useVideo';
import './search.css';

function highlight(text: string, query: string): string {
    const isQueryEmpty = query.trim() === '';
    if (isQueryEmpty) { return text; }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
}

export default function SearchPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const { publishedVideos } = useVideo();
    const query = searchParams.get('q') ?? '';

    const results = useMemo(() => {
        const isQueryEmpty = query.trim() === '';
        if (isQueryEmpty) { return publishedVideos; }

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

    return (
        <div className="search-page">
            <div className="search-page__header">
                {hasQuery ? (
                    <>
                        <p className="search-page__results-label">
                            {t('video.results_for_query', { count: results.length })}
                        </p>
                        <span className="search-page__query">&ldquo;{query}&rdquo;</span>
                    </>
                ) : (
                    <h1 className="search-page__title">{t('video.search_placeholder')}</h1>
                )}
            </div>

            {hasResults ? (
                <div className="search-page__list">
                    {results.map(video => (
                        <div key={video.id} className="search-page__item">
                            <VideoRow
                                video={video}
                                titleHighlight={hasQuery ? highlight(video.title, query) : undefined}
                            />
                        </div>
                    ))}
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
