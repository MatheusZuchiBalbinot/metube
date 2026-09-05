import type { KeyboardEvent } from 'react';

export function isTypingInInput(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) {
        return false;
    }

    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

export function isActivationKey(e: KeyboardEvent): boolean {
    return e.key === 'Enter' || e.key === ' ';
}
