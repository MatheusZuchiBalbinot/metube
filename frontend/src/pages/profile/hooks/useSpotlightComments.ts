import { useState, useEffect } from 'react';
import { comments as commentsApi } from '@api';
import { toVuid } from '@api';
import type { Comment, VideoId } from '@models';

export function useSpotlightComments(featuredId: VideoId | null): Comment[] {
    const [spotlightComments, setSpotlightComments] = useState<Comment[]>([]);

    useEffect(() => {
        if (featuredId === null) {
            setSpotlightComments([]);
            return;
        }

        commentsApi.list(toVuid(featuredId), { page: 1 }).then(res => {
            if (res.ok) {
                setSpotlightComments(res.data.data.slice(0, 2));
            }
        });
    }, [featuredId]);

    return spotlightComments;
}
