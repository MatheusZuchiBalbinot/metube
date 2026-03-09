import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';
import './styles/base.css';
import './styles/animations.css';
import './styles/tailwind.css';
import App from './App.tsx';
import { STORAGE_KEYS } from '@utils/storageKeys';

const initialMode = localStorage.getItem(STORAGE_KEYS.THEME_MODE) ?? 'dark';
const initialColor = localStorage.getItem(STORAGE_KEYS.THEME_COLOR) ?? 'violet';
document.documentElement.dataset.mode = initialMode;
document.documentElement.dataset.color = initialColor;

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
