import { useState, useEffect } from 'react';
import { channel } from '@api';
import { useAppSelector } from '@store';
import { selectSubscribedChannelIds, selectSubscribedSet } from '@store/subscriptionSelectors';
import type { ChannelId, User } from '@models';

/**
 * Fetches the authenticated user's subscribed channels (full `User` objects) so
 * the sidebar can render avatars and names — unlike `useSubscription`, which only
 * exposes the locally-tracked set of subscribed channel ids.
 *
 * Refetches when the subscription count changes and filters the result by the
 * local `subscribedSet` so optimistic unsubscribes disappear immediately, before
 * the server list is reloaded.
 */
export function useSubscriptions() {
    const user = useAppSelector(s => s.auth.user);
    const subscribedIds = useAppSelector(selectSubscribedChannelIds);
    const subscribedSet = useAppSelector(selectSubscribedSet);
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

    const visibleChannels = channels.filter(c => subscribedSet.has(c.uuid as ChannelId));

    return { channels: visibleChannels, isLoading };
}
