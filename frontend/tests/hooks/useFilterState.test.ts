// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFilterState } from '@hooks/useFilterState';
import { SortBy, VideoFilter } from '@utils/applyFilters';
import type { Tag } from '@models/tag';

describe('useFilterState — initial state', () => {
    it('starts with the empty filter state', () => {
        const { result } = renderHook(() => useFilterState());
        expect(result.current.filterState).toEqual(VideoFilter.emptyState());
    });

    it('starts with hasActiveFilters = false', () => {
        const { result } = renderHook(() => useFilterState());
        expect(result.current.hasActiveFilters).toBe(false);
    });
});

describe('useFilterState — setFilterState', () => {
    it('updates filterState when setFilterState is called', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                tags: ['react' as Tag],
                year: 2024,
                dateFrom: null,
                dateTo: null,
                sortBy: SortBy.RECENT,
            });
        });

        expect(result.current.filterState.tags).toEqual(['react']);
        expect(result.current.filterState.year).toBe(2024);
    });

    it('sets hasActiveFilters = true when tags are added', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                ...VideoFilter.emptyState(),
                tags: ['typescript' as Tag],
            });
        });

        expect(result.current.hasActiveFilters).toBe(true);
    });

    it('sets hasActiveFilters = true when year is set', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                ...VideoFilter.emptyState(),
                year: 2023,
            });
        });

        expect(result.current.hasActiveFilters).toBe(true);
    });

    it('sets hasActiveFilters = true when dateFrom is set', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                ...VideoFilter.emptyState(),
                dateFrom: '2024-01-01',
            });
        });

        expect(result.current.hasActiveFilters).toBe(true);
    });

    it('sets hasActiveFilters = true when dateTo is set', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                ...VideoFilter.emptyState(),
                dateTo: '2024-12-31',
            });
        });

        expect(result.current.hasActiveFilters).toBe(true);
    });

    it('sets hasActiveFilters = true when sortBy is not RECENT', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                ...VideoFilter.emptyState(),
                sortBy: SortBy.VIEWS,
            });
        });

        expect(result.current.hasActiveFilters).toBe(true);
    });
});

describe('useFilterState — clearFilters', () => {
    it('resets filterState to the empty state', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                tags: ['react' as Tag],
                year: 2024,
                dateFrom: '2024-01-01',
                dateTo: '2024-12-31',
                sortBy: SortBy.AZ,
            });
        });

        act(() => {
            result.current.clearFilters();
        });

        expect(result.current.filterState).toEqual(VideoFilter.emptyState());
    });

    it('resets hasActiveFilters to false after clearing', () => {
        const { result } = renderHook(() => useFilterState());

        act(() => {
            result.current.setFilterState({
                ...VideoFilter.emptyState(),
                sortBy: SortBy.VIEWS,
            });
        });

        act(() => {
            result.current.clearFilters();
        });

        expect(result.current.hasActiveFilters).toBe(false);
    });
});
