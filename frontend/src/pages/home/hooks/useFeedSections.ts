import { useState, useEffect } from 'react';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import { feed, type FeedSection } from '@api';

// Backend returns sections already ordered/personalised (or generic for guests).
export function useFeedSections() {
    const dispatch = useAppDispatch();
    const [sections, setSections] = useState<FeedSection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isCancelled = false;

        async function load() {
            const result = await feed.list();

            if (isCancelled) {
                return;
            }

            if (result.ok) {
                setSections(result.data);
            } else {
                dispatch(toastActions.addToast({ message: result.error, type: ToastType.ERROR }));
            }
            setIsLoading(false);
        }

        void load();

        return () => {
            isCancelled = true;
        };
    }, [dispatch]);

    return { sections, isLoading };
}
