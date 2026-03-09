import { useEffect } from 'react';
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

    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(toastActions.removeToast(toast.id));
        }, AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [toast.id, dispatch]);

    function handleClose() {
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
            <button className="toast__close" onClick={handleClose} aria-label="Close">
                <X size={14} />
            </button>
        </div>
    );
}

export default function ToastContainer() {
    const toasts = useAppSelector(state => state.toast.toasts);

    return (
        <div className="toast-container" aria-live="polite">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
}
