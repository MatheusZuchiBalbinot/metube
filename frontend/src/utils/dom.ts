import type { KeyboardEvent } from 'react';

/** Returns true when focus is on a text input, textarea, select, or contenteditable element. */
export function isTypingInInput(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) {
        return false;
    }

    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

/** Returns true when a keyboard event is the Enter or Space "activate" key. */
export function isActivationKey(e: KeyboardEvent): boolean {
    return e.key === 'Enter' || e.key === ' ';
}
