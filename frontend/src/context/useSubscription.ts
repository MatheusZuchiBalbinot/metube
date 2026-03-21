import { useAppDispatch, useAppSelector } from '@store';
import { subscriptionActions, selectSubscribedSet } from '@store/subscriptionSlice';

export function useSubscription() {
    const dispatch = useAppDispatch();
    const subscribedChannelIds = useAppSelector(s => s.subscription.subscribedChannelIds);
    const subscribedSet = useAppSelector(selectSubscribedSet);

    function toggleSubscription(channelId: string) {
        dispatch(subscriptionActions.toggleSubscription(channelId));
    }

    function isSubscribed(channelId: string): boolean {
        return subscribedSet.has(channelId);
    }

    return {
        subscribedChannelIds,
        subscribedSet,
        toggleSubscription,
        isSubscribed,
    };
}
