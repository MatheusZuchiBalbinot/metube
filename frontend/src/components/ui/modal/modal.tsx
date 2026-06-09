import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import Button from '../button/button';
import type { Size } from '../types';
import './modal.css';

const FOCUSABLE_SELECTORS = 'button, input, select, textarea, a[href]';

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: React.ReactNode
    footer?: React.ReactNode
    size?: Size
    triggerRef?: React.RefObject<HTMLElement>
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'md',
    triggerRef,
}: ModalProps) {
    const { t } = useTranslation();
    const boxRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        function handleFocusTrap(e: KeyboardEvent, focusable: HTMLElement[]) {
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            const isFocusOnFirst = document.activeElement === first;
            const isFocusOnLast = document.activeElement === last;

            const isShiftTab = e.shiftKey && isFocusOnFirst;
            if (isShiftTab) {
                e.preventDefault();
                last.focus();
                return;
            }

            const isTab = !e.shiftKey && isFocusOnLast;
            if (isTab) {
                e.preventDefault();
                first.focus();
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                onClose();
                return;
            }

            const isTab = e.key === 'Tab';
            if (!isTab) {
                return;
            }

            const focusable = boxRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
            const isNoFocusable = !focusable || focusable.length === 0;
            if (isNoFocusable) {
                e.preventDefault();
                return;
            }

            handleFocusTrap(e, Array.from(focusable));
        }

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        const shouldFocusOnOpen = isOpen;
        if (!shouldFocusOnOpen) {
            return;
        }

        const frameId = requestAnimationFrame(() => {
            const firstFocusable = boxRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
            firstFocusable?.focus();
        });

        return () => cancelAnimationFrame(frameId);
    }, [isOpen]);

    useEffect(() => {
        const hasTrigger = triggerRef !== undefined;
        if (isOpen || !hasTrigger) {
            return;
        }

        triggerRef.current?.focus();
    }, [isOpen, triggerRef]);

    if (!isOpen) {
        return null;
    }

    return createPortal(
        <div className="modal-overlay" role="presentation" onClick={onClose}>
            <div
                ref={boxRef}
                className={`modal-box modal-box--${size}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                onClick={(e) => e.stopPropagation()}
            >
                {title && (
                    <div className="modal-header">
                        <h2 id="modal-title">{title}</h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="modal-close"
                            onClick={onClose}
                            aria-label={t('common.close')}
                        >
                            <X size={13} strokeWidth={2.5} />
                        </Button>
                    </div>
                )}

                <div className="modal-body">{children}</div>

                {footer && (
                    <div className="modal-footer">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    );
}
