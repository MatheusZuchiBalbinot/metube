import { useMemo } from 'react';
import { collectTags } from '@utils';
import type { Video, Tag } from '@models';

export function useAllTags(videos: Video[]): Tag[] {
    return useMemo(() => collectTags(videos), [videos]);
}
