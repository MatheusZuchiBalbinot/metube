import { useMemo } from 'react';
import { collectTags } from '@utils';
import type { Video, Tag } from '@models';

/** Memoized, deduplicated, alphabetically sorted list of tags across `videos`. */
export function useAllTags(videos: Video[]): Tag[] {
    return useMemo(() => collectTags(videos), [videos]);
}
