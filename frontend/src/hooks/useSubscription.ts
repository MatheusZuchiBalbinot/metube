import { useAppDispatch, useAppSelector } from '@store';
import { subscriptionActions, selectSubscribedSet } from '@store/subscriptionSlice';
import type { ChannelId } from '@models/channel';

export function useSubscription() {
    const dispatch = useAppDispatch();
    const subscribedChannelIds = useAppSelector(s => s.subscription.subscribedChannelIds);
    const subscribedSet = useAppSelector(selectSubscribedSet);

    function toggleSubscription(channelId: ChannelId) {
        dispatch(subscriptionActions.toggleSubscription(channelId));
    }

    function isSubscribed(channelId: ChannelId): boolean {
        return subscribedSet.has(channelId);
    }

    return {
        subscribedChannelIds,
        subscribedSet,
        toggleSubscription,
        isSubscribed,
    };
}
