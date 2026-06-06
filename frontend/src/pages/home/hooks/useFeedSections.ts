import { useState, useEffect } from 'react';
import { feed, type FeedSection } from '@api';

/**
 * Loads the server-composed home feed shelves once. The backend returns the
 * sections already ordered and personalised (or generic for guests).
 */
export function useFeedSections() {
    const [sections, setSections] = useState<FeedSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        async function load() {
            const result = await feed.list();

            if (isCancelled) {
                return;
            }

            setSections(result.ok ? result.data : []);
            setIsLoading(false);
        }

        void load();

        return () => {
            isCancelled = true;
        };
    }, []);

    return { sections, isLoading };
}
