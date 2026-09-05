import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@store';
import { subscriptionActions } from '@store/subscriptionSlice';
import { toastActions } from '@store/toastSlice';
import { selectSubscribedChannelIds, selectSubscribedSet } from '@store/subscriptionSelectors';
import { channel, toUuid } from '@api';
import { ToastType } from '@enums/toastType';
import type { ChannelId } from '@models';

export function useSubscription() {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const subscribedChannelIds = useAppSelector(selectSubscribedChannelIds);
    const subscribedSet = useAppSelector(selectSubscribedSet);
    // Tracks channels with an in-flight toggle request. Without this, a fast
    // double-click (or a double-firing click event) races two toggle() calls
    // against the same toggle endpoint — the second one flips the just-applied
    // change straight back, so the subscribe silently cancels itself out and
    // fires two toasts for what looks like a single click.
    const pendingRef = useRef<Set<ChannelId>>(new Set());

    const toggleSubscription = useCallback(async (channelId: ChannelId) => {
        if (pendingRef.current.has(channelId)) {
            return;
        }

        pendingRef.current.add(channelId);

        try {
            const wasSubscribed = subscribedSet.has(channelId);

            // Optimistic: flip local state immediately, then persist to the
            // server. Without the server call, the sidebar's subscription list
            // (fetched from GET /users/me/subscriptions) never reflects the change.
            dispatch(subscriptionActions.toggleSubscription(channelId));

            const succeeded = await channel.toggleSubscription(toUuid(channelId));

            if (!succeeded) {
                // Roll back the optimistic flip — toggling again restores the prior state.
                dispatch(subscriptionActions.toggleSubscription(channelId));
                dispatch(toastActions.addToast({ message: t('toast.subscription_error'), type: ToastType.ERROR }));

                return;
            }

            dispatch(toastActions.addToast({
                message: wasSubscribed ? t('toast.unsubscribed') : t('toast.subscribed'),
                type: ToastType.SUCCESS,
            }));
        } finally {
            pendingRef.current.delete(channelId);
        }
    }, [dispatch, subscribedSet, t]);

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
