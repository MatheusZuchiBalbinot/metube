import { useState, useEffect } from 'react';
import { channel } from '@api';
import { useAppSelector } from '@store';
import { selectSubscribedChannelIds } from '@store/subscriptionSelectors';
import type { User } from '@models';

/**
 * Fetches the authenticated user's subscribed channels (full `User` objects) so
 * the sidebar can render avatars and names — unlike `useSubscription`, which only
 * exposes the locally-tracked set of subscribed channel ids.
 *
 * The server list (GET /users/me/subscriptions) is the source of truth — it is
 * not filtered against the locally-persisted `subscribedSet`, which can drift
 * out of sync with the backend (different session, cleared storage, etc.) and
 * previously caused this list to show empty even with real subscriptions.
 * Refetches whenever the local subscription count changes, which fires right
 * after a subscribe/unsubscribe action.
 */
export function useSubscriptions() {
    const user = useAppSelector(s => s.auth.user);
    const subscribedIds = useAppSelector(selectSubscribedChannelIds);
    const [channels, setChannels] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = user !== null;
    const subscriptionCount = subscribedIds.length;

    useEffect(() => {
        let isCancelled = false;

        async function load() {
            if (!isAuthenticated) {
                setChannels([]);
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            const result = await channel.subscriptions();

            if (isCancelled) {
                return;
            }

            if (!result.ok) {
                setChannels([]);
                setIsLoading(false);
                return;
            }

            setChannels(result.data);
            setIsLoading(false);
        }

        load();

        return () => {
            isCancelled = true;
        };
    }, [isAuthenticated, subscriptionCount]);

    return { channels, isLoading };
}
