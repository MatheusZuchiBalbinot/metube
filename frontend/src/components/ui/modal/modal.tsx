import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from '@components/icons/icons';
import Button from '../button/button';
import type { Size } from '../types';
import { useMediaQuery } from '@hooks';
import { cn } from '@utils';
import './modal.css';

const FOCUSABLE_SELECTORS = 'button, input, select, textarea, a[href]';

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
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
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

    // Stay mounted a beat past isOpen going false so the exit animation can play —
    // otherwise the modal that fades/scales in on open just vanishes on close.
    const [shouldRender, setShouldRender] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local mount/animation state to the isOpen prop is the point of this effect
            setShouldRender(true);
            setIsClosing(false);
            return;
        }

        if (!shouldRender) {
            return;
        }

        if (prefersReducedMotion) {
            setShouldRender(false);
            return;
        }

        setIsClosing(true);
        // shouldRender is only read to decide whether a close needs animating — it's set by
        // this same effect and by the animationend handler, so it must stay out of the deps
        // below or every state flip it causes would immediately re-run this effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, prefersReducedMotion]);

    function handleOverlayAnimationEnd(e: React.AnimationEvent) {
        // Ignore the box's own animation bubbling up — only the overlay's own
        // exit animation (matched by target, not name) should trigger unmount.
        const isOwnAnimation = e.target === e.currentTarget;

        if (isClosing && isOwnAnimation) {
            setShouldRender(false);
            setIsClosing(false);
        }
    }

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

    useLayoutEffect(() => {
        const shouldFocusOnOpen = isOpen && shouldRender;
        if (!shouldFocusOnOpen) {
            return;
        }

        const firstFocusable = boxRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTORS);
        if (!firstFocusable) {
            return;
        }

        // A mouse click already moved focus onto the trigger button before this effect
        // runs, beating a deferred autofocus and breaking the focus trap's "is
        // activeElement inside the modal" check. Blur first to make the takeover
        // deterministic regardless of how the modal was opened.
        (document.activeElement as HTMLElement | null)?.blur();
        firstFocusable.focus();
    }, [isOpen, shouldRender]);

    useEffect(() => {
        const hasTrigger = triggerRef !== undefined;
        if (isOpen || !hasTrigger) {
            return;
        }

        triggerRef.current?.focus();
    }, [isOpen, triggerRef]);

    if (!shouldRender) {
        return null;
    }

    function handleOverlayClick(e: React.MouseEvent) {
        const isBackdropClick = e.target === e.currentTarget;

        if (isBackdropClick) {
            onClose();
        }
    }

    return createPortal(
        <div
            className={cn('modal-overlay', isClosing && 'modal-overlay--closing')}
            role="presentation"
            onClick={handleOverlayClick}
            onAnimationEnd={handleOverlayAnimationEnd}
        >
            <div
                ref={boxRef}
                className={cn('modal-box', `modal-box--${size}`, isClosing && 'modal-box--closing')}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
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

                <div className="modal-body">{children}</div>

                {footer && (
                    <div className="modal-footer">{footer}</div>
                )}
            </div>
        </div>,
        document.body,
    );
}
