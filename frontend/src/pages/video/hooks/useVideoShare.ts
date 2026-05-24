import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { useBurstAnimation } from '@hooks';
import { ToastType } from '@enums/toastType';

interface UseVideoShareResult {
    isShareDropdownOpen: boolean
    setIsShareDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>
    isCopied: boolean
    handleShareCopyLink: () => void
    handleShareCopyAtTime: () => void
}

export function useVideoShare(getCurrentTime: () => number): UseVideoShareResult {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
    const [isCopied, triggerCopied] = useBurstAnimation(2000);

    function handleShareCopyLink() {
        const url = window.location.href.split('?')[0];
        navigator.clipboard.writeText(url);
        dispatch(toastActions.addToast({ message: t('toast.link_copied'), type: ToastType.INFO }));
        triggerCopied();
        setIsShareDropdownOpen(false);
    }

    function handleShareCopyAtTime() {
        const seconds = Math.floor(getCurrentTime());
        const baseUrl = window.location.href.split('?')[0];
        const url = `${baseUrl}?t=${seconds}s`;
        navigator.clipboard.writeText(url);
        dispatch(toastActions.addToast({ message: t('toast.link_copied'), type: ToastType.INFO }));
        triggerCopied();
        setIsShareDropdownOpen(false);
    }

    return { isShareDropdownOpen, setIsShareDropdownOpen, isCopied, handleShareCopyLink, handleShareCopyAtTime };
}
