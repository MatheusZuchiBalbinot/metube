import { useState } from 'react';
import { VideoFilter, SortBy, type FilterState } from '@utils';

export interface UseFilterStateReturn {
    filterState: FilterState
    setFilterState: (f: FilterState) => void
    hasActiveFilters: boolean
    clearFilters: () => void
}

export function useFilterState(): UseFilterStateReturn {
    const [filterState, setFilterState] = useState<FilterState>(VideoFilter.emptyState);

    const hasActiveFilters =
        filterState.tags.length > 0 ||
        filterState.year !== null ||
        filterState.dateFrom !== null ||
        filterState.dateTo !== null ||
        filterState.sortBy !== SortBy.RECENT;

    function clearFilters() {
        setFilterState(VideoFilter.emptyState());
    }

    return { filterState, setFilterState, hasActiveFilters, clearFilters };
}
