import '@testing-library/jest-dom/vitest';
import i18n from '../src/i18n';

// i18next is already configured globally, just ensure it's initialized
i18n.init();

// jsdom does not implement window.matchMedia — provide a minimal stub
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
    }),
});
