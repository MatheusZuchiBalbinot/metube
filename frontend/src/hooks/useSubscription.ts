import { useAppDispatch, useAppSelector } from '@store';
import { subscriptionActions, selectSubscribedSet } from '@store/subscriptionSlice';
import type { ChannelId } from '@models/channel';

export function useSubscription() {
    const dispatch = useAppDispatch();
    const subscribedChannelIds = useAppSelector(s => s.subscription.subscribedChannelIds);
    const subscribedSet = useAppSelector(selectSubscribedSet);

    function toggleSubscription(channelId: string) {
        dispatch(subscriptionActions.toggleSubscription(channelId as unknown as ChannelId));
    }

    function isSubscribed(channelId: string): boolean {
        return subscribedSet.has(channelId as unknown as ChannelId);
    }

    return {
        subscribedChannelIds,
        subscribedSet,
        toggleSubscription,
        isSubscribed,
    };
}
