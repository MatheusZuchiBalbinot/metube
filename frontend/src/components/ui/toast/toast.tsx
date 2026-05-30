import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store';
import { toastActions, type Toast } from '@store/toastSlice';
import { cn } from '@utils';
import './toast.css';

const AUTO_DISMISS_MS = 3500;

interface ToastItemProps {
    toast: Toast
}

function ToastItem({ toast }: ToastItemProps) {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    const duration = toast.duration ?? AUTO_DISMISS_MS;

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(toastActions.removeToast(toast.id));
        }, duration);
        return () => clearTimeout(timer);
    }, [toast.id, duration, dispatch]);

    function handleClose() {
        dispatch(toastActions.removeToast(toast.id));
    }

    function handleAction() {
        toast.action?.onClick();
        dispatch(toastActions.removeToast(toast.id));
    }

    const hasMedia = toast.thumbnail !== undefined;

    if (hasMedia) {
        return (
            <div className={cn('toast', 'toast--media', `toast--${toast.type}`)} role="alert">
                <img
                    className="toast__thumb"
                    src={toast.thumbnail}
                    alt=""
                    aria-hidden="true"
                />
                <div className="toast__body">
                    <span className="toast__message">{toast.message}</span>
                    {toast.subtitle !== undefined && (
                        <span className="toast__subtitle">{toast.subtitle}</span>
                    )}
                </div>
                {toast.action !== undefined && (
                    <button type="button" className="toast__action" onClick={handleAction}>
                        {toast.action.label}
                    </button>
                )}
                <button
                    type="button"
                    className="toast__close"
                    onClick={handleClose}
                    aria-label={t('common.close')}
                >
                    <X size={13} />
                </button>
                <div className="toast__progress" style={{ animationDuration: `${duration}ms` }} />
            </div>
        );
    }

    return (
        <div className={cn('toast', `toast--${toast.type}`)} role="alert">
            <span className="toast__dot" aria-hidden="true" />
            <span className="toast__message">{toast.message}</span>
            {toast.action !== undefined && (
                <button type="button" className="toast__action" onClick={handleAction}>
                    {toast.action.label}
                </button>
            )}
            <button
                type="button"
                className="toast__close"
                onClick={handleClose}
                aria-label={t('common.close')}
            >
                <X size={13} />
            </button>
            <div className="toast__progress" style={{ animationDuration: `${duration}ms` }} />
        </div>
    );
}

export default function ToastContainer() {
    const toasts = useAppSelector(state => state.toast.toasts);

    return (
        <div className="toast-container" aria-live="polite" aria-atomic="true">
            {toasts.map((toast: Toast) => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
}
