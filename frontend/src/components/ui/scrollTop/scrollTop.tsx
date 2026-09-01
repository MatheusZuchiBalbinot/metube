import { useState, useEffect, useRef } from 'react';
import { ArrowUp } from '@components/icons/icons';
import { useTranslation } from 'react-i18next';
import './scrollTop.css';

const SHOW_AFTER_PX = 600;

export default function ScrollTopButton() {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const tickingRef = useRef(false);

    useEffect(() => {
        function update() {
            tickingRef.current = false;
            setVisible(window.scrollY > SHOW_AFTER_PX);
        }

        function onScroll() {
            if (tickingRef.current) {
                return;
            }

            tickingRef.current = true;
            requestAnimationFrame(update);
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        update();

        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    function handleClick() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (!visible) {
        return null;
    }

    return (
        <button
            type="button"
            className="scroll-top"
            onClick={handleClick}
            aria-label={t('common.back_to_top')}
            title={t('common.back_to_top')}
        >
            <ArrowUp size={20} strokeWidth={2} />
        </button>
    );
}
