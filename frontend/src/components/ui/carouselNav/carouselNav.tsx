import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Button from '../button/button';
import { cn } from '@utils';
import Tooltip from '../tooltip/tooltip';
import './carouselNav.css';

interface CarouselNavProps {
    onPrev: () => void;
    onNext: () => void;
    canScrollLeft: boolean;
    canScrollRight: boolean;
    className?: string;
}

export default function CarouselNav({ onPrev, onNext, canScrollLeft, canScrollRight, className }: CarouselNavProps) {
    const { t } = useTranslation();

    const cls = cn('carousel-nav', className);

    return (
        <div className={cls}>
            <Tooltip content={t('common.back')} side="top">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.back')}
                    onClick={onPrev}
                    disabled={!canScrollLeft}
                >
                    <ChevronLeft size={16} />
                </Button>
            </Tooltip>
            <Tooltip content={t('home.next')} side="top">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('home.next')}
                    onClick={onNext}
                    disabled={!canScrollRight}
                >
                    <ChevronRight size={16} />
                </Button>
            </Tooltip>
        </div>
    );
}
