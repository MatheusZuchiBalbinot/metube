import { useRef, useState, useEffect } from 'react';
import VideoCard from '@components/video/card';
import CarouselNav from '@components/ui/carouselNav/carouselNav';
import type { Video } from '@models';

interface VideoShelfProps {
    title: string;
    videos: Video[];
    icon?: React.ReactNode;
    action?: React.ReactNode;
}

/**
 * Horizontal, scrollable shelf of video cards with prev/next controls.
 * Each shelf owns its scroll state, so the home page can stack many of them
 * without duplicating carousel logic.
 */
export default function VideoShelf({ title, videos, icon, action }: VideoShelfProps) {
    const railRef = useRef<HTMLDivElement>(null);
    const [scroll, setScroll] = useState({ canScrollLeft: false, canScrollRight: true });

    useEffect(() => {
        const el = railRef.current;
        if (!el) {
            return;
        }

        function update() {
            const canScrollLeft = el!.scrollLeft > 1;
            const canScrollRight = el!.scrollLeft < el!.scrollWidth - el!.clientWidth - 1;
            setScroll({ canScrollLeft, canScrollRight });
        }

        update();
        el.addEventListener('scroll', update, { passive: true });
        const observer = new ResizeObserver(update);
        observer.observe(el);

        return () => {
            el.removeEventListener('scroll', update);
            observer.disconnect();
        };
    }, [videos.length]);

    function scrollRail(direction: 'left' | 'right') {
        const el = railRef.current;
        if (!el) {
            return;
        }
        const amount = el.clientWidth * 0.7;
        el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
    }

    if (videos.length === 0) {
        return null;
    }

    return (
        <section className="home-page__section">
            <div className="home-page__section-header">
                <div className="home-page__section-title-group">
                    {icon}
                    <h2 className="home-page__section-title">{title}</h2>
                </div>
                <div className="home-page__section-actions">
                    {action}
                    <CarouselNav
                        className="home-page__carousel-nav"
                        onPrev={() => scrollRail('left')}
                        onNext={() => scrollRail('right')}
                        canScrollLeft={scroll.canScrollLeft}
                        canScrollRight={scroll.canScrollRight}
                    />
                </div>
            </div>
            <div className="home-page__carousel" ref={railRef}>
                {videos.map(video => (
                    <div key={video.id} className="home-page__carousel-item">
                        <VideoCard video={video} />
                    </div>
                ))}
            </div>
        </section>
    );
}
