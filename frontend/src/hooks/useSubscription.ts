import { useAppDispatch, useAppSelector } from '@store';
import { subscriptionActions } from '@store/subscriptionSlice';
import { selectSubscribedChannelIds, selectSubscribedSet } from '@store/subscriptionSelectors';
import type { ChannelId } from '@models';

export function useSubscription() {
    const dispatch = useAppDispatch();
    const subscribedChannelIds = useAppSelector(selectSubscribedChannelIds);
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
