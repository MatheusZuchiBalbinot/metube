/** Returns true when focus is on a text input, textarea, select, or contenteditable element. */
export function isTypingInInput(target: EventTarget | null): boolean {
    const el = target as HTMLElement | null;
    if (!el) {
        return false;
    }
    return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}
