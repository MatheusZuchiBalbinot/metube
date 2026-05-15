import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store';
import { toastActions, type Toast } from '@store/toastSlice';
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

    const iconMap = {
        success: <CheckCircle2 size={18} />,
        error: <AlertCircle size={18} />,
        info: <Info size={18} />,
    };

    const toastClass = ['toast', `toast--${toast.type}`].join(' ');

    return (
        <div className={toastClass} role="alert">
            <span className="toast__icon">{iconMap[toast.type]}</span>
            <span className="toast__message">{toast.message}</span>
            {toast.action !== undefined && (
                <button className="toast__action" onClick={handleAction}>
                    {toast.action.label}
                </button>
            )}
            <button className="toast__close" onClick={handleClose} aria-label={t('common.close')}>
                <X size={14} />
            </button>
            <div
                className="toast__progress"
                style={{ animationDuration: `${duration}ms` }}
            />
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
