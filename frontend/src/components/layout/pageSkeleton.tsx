import Skeleton from '@ui/skeleton/skeleton';
import VideoCardSkeleton from '@components/video/cardSkeleton';
import VideoRowSkeleton from '@components/video/rowSkeleton';
import { ROUTES } from '@utils/routes';
import './pageSkeleton.css';

// ─── Shared building blocks ────────────────────────────────────────────────

function FilterBarSkeleton() {
    return (
        <div className="ps-filter" aria-hidden="true">
            {[72, 64, 88, 60, 76].map((w, i) => (
                <Skeleton key={i} className="ps-filter__chip" style={{ width: w }} />
            ))}
            <Skeleton className="ps-filter__sort" />
        </div>
    );
}

function GridSkeleton({ count, className }: { count: number; className: string }) {
    return (
        <div className={className} aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <VideoCardSkeleton key={i} />
            ))}
        </div>
    );
}

// ─── Home ─────────────────────────────────────────────────────────────────

function HomePageSkeleton() {
    return (
        <div className="ps ps--home" aria-hidden="true">
            {/* Trending carousel */}
            <div className="ps__section">
                <div className="ps__section-head">
                    <Skeleton className="ps__section-icon" />
                    <Skeleton className="ps__section-title" />
                </div>
                <div className="ps-carousel">
                    {Array.from({ length: 5 }, (_, i) => (
                        <div key={i} className="ps-carousel__item">
                            <VideoCardSkeleton />
                        </div>
                    ))}
                </div>
            </div>

            {/* Filter bar */}
            <div className="ps__filters">
                <FilterBarSkeleton />
            </div>

            {/* Continue Watching (small strip) */}
            <div className="ps__section ps__section--sm">
                <div className="ps__section-head">
                    <Skeleton className="ps__section-title ps__section-title--sm" />
                </div>
                <div className="ps-carousel ps-carousel--sm">
                    {Array.from({ length: 4 }, (_, i) => (
                        <div key={i} className="ps-carousel__item ps-carousel__item--sm">
                            <VideoCardSkeleton />
                        </div>
                    ))}
                </div>
            </div>

            {/* Main grid */}
            <div className="ps__main">
                <GridSkeleton count={10} className="ps-grid ps-grid--home" />
            </div>
        </div>
    );
}

// ─── History ──────────────────────────────────────────────────────────────

function HistoryPageSkeleton() {
    return (
        <div className="ps ps--history" aria-hidden="true">
            <div className="ps__header">
                <Skeleton className="ps__title" />
                <Skeleton className="ps__action-btn" />
            </div>

            <div className="ps-history-controls">
                <Skeleton className="ps-history-controls__search" />
                <div className="ps-history-controls__periods">
                    {[48, 52, 76, 64].map((w, i) => (
                        <Skeleton key={i} className="ps-history-controls__period" style={{ width: w }} />
                    ))}
                </div>
            </div>

            {[4, 3, 2].map((count, gi) => (
                <div key={gi} className="ps-history-group">
                    <Skeleton className="ps-history-group__label" />
                    <div className="ps-history-group__list">
                        {Array.from({ length: count }, (_, i) => (
                            <VideoRowSkeleton key={i} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Liked / Watch Later ──────────────────────────────────────────────────

function CollectionPageSkeleton() {
    return (
        <div className="ps ps--collection" aria-hidden="true">
            <div className="ps__header">
                <Skeleton className="ps__title" />
                <Skeleton className="ps__count" />
            </div>
            <div className="ps__filters">
                <FilterBarSkeleton />
            </div>
            <GridSkeleton count={8} className="ps-grid ps-grid--four" />
        </div>
    );
}

// ─── Search ───────────────────────────────────────────────────────────────

function SearchPageSkeleton() {
    return (
        <div className="ps ps--search" aria-hidden="true">
            <div className="ps-search-hero">
                <Skeleton className="ps-search-hero__input" />
            </div>
            <div className="ps__header ps__header--sm">
                <Skeleton className="ps__title ps__title--sm" />
                <Skeleton className="ps__count" />
            </div>
            <div className="ps__list">
                {Array.from({ length: 7 }, (_, i) => (
                    <VideoRowSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

// ─── Profile ──────────────────────────────────────────────────────────────

function ProfilePageSkeleton() {
    return (
        <div className="ps ps--profile" aria-hidden="true">
            <div className="ps-profile__banner" />

            <div className="ps-profile__header">
                <div className="ps-profile__avatar-wrap">
                    <Skeleton className="ps-profile__avatar" />
                </div>
                <div className="ps-profile__info">
                    <div className="ps-profile__name-row">
                        <Skeleton className="ps-profile__name" />
                        <Skeleton className="ps-profile__edit-btn" />
                    </div>
                    <Skeleton className="ps-profile__bio" />
                    <div className="ps-profile__stats">
                        {[84, 110, 72, 98, 88].map((w, i) => (
                            <Skeleton key={i} className="ps-profile__stat" style={{ width: w }} />
                        ))}
                    </div>
                    <div className="ps-profile__heatmap-controls">
                        <Skeleton className="ps-profile__heatmap-btn" />
                        <Skeleton className="ps-profile__heatmap-btn" />
                    </div>
                    <div className="ps-profile__heatmap">
                        {Array.from({ length: 30 }, (_, i) => (
                            <Skeleton key={i} className="ps-profile__heatmap-bar" />
                        ))}
                    </div>
                </div>
            </div>

            <div className="ps-profile__tabs">
                {[100, 72, 88].map((w, i) => (
                    <Skeleton key={i} className="ps-profile__tab" style={{ width: w }} />
                ))}
            </div>

            <div className="ps__main">
                <GridSkeleton count={8} className="ps-grid ps-grid--four" />
            </div>
        </div>
    );
}

// ─── Video ────────────────────────────────────────────────────────────────

function VideoPageSkeleton() {
    return (
        <div className="ps ps--video" aria-hidden="true">
            <div className="ps-video__main">
                <Skeleton className="ps-video__player" />

                <div className="ps-video__meta">
                    <Skeleton className="ps-video__title" />
                    <Skeleton className="ps-video__title ps-video__title--short" />
                    <div className="ps-video__stats-row">
                        <div className="ps-video__stats">
                            <Skeleton className="ps-video__stat" />
                            <Skeleton className="ps-video__stat ps-video__stat--dot" />
                            <Skeleton className="ps-video__stat" />
                        </div>
                        <div className="ps-video__actions">
                            {Array.from({ length: 4 }, (_, i) => (
                                <Skeleton key={i} className="ps-video__action-btn" />
                            ))}
                        </div>
                    </div>
                </div>

                <div className="ps-video__tags">
                    {[72, 88, 60, 96, 68].map((w, i) => (
                        <Skeleton key={i} className="ps-video__tag" style={{ width: w }} />
                    ))}
                </div>

                <div className="ps-video__desc">
                    {[100, 95, 82, 70].map((pct, i) => (
                        <Skeleton key={i} className="ps-video__desc-line" style={{ width: `${pct}%` }} />
                    ))}
                </div>
            </div>

            <div className="ps-video__sidebar">
                <div className="ps-video__sidebar-inner">
                    <div className="ps-video__sidebar-tabs">
                        <Skeleton className="ps-video__sidebar-tab" />
                        <Skeleton className="ps-video__sidebar-tab" />
                    </div>
                    <div className="ps-video__sidebar-list">
                        {Array.from({ length: 5 }, (_, i) => (
                            <VideoRowSkeleton key={i} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Channel ──────────────────────────────────────────────────────────────

function ChannelPageSkeleton() {
    return (
        <div className="ps ps--channel" aria-hidden="true">
            <div className="ps__back-header">
                <Skeleton className="ps__back-btn" />
            </div>

            <div className="ps-channel__banner" />

            <div className="ps-channel__header">
                <Skeleton className="ps-channel__avatar" />
                <div className="ps-channel__info">
                    <div className="ps-channel__name-row">
                        <Skeleton className="ps-channel__name" />
                        <Skeleton className="ps-channel__subscribe-btn" />
                    </div>
                    <div className="ps-channel__stats">
                        {[80, 96, 72].map((w, i) => (
                            <Skeleton key={i} className="ps-channel__stat" style={{ width: w }} />
                        ))}
                    </div>
                    <div className="ps-channel__tags">
                        {[68, 84, 56, 72].map((w, i) => (
                            <Skeleton key={i} className="ps-channel__tag" style={{ width: w }} />
                        ))}
                    </div>
                </div>
            </div>

            <div className="ps__main">
                <GridSkeleton count={8} className="ps-grid ps-grid--four" />
            </div>
        </div>
    );
}

// ─── Router ───────────────────────────────────────────────────────────────

interface PageSkeletonProps {
    pathname: string;
}

export default function PageSkeleton({ pathname }: PageSkeletonProps) {
    const isVideoPage = pathname.startsWith('/video/');
    const isProfilePage = pathname === ROUTES.PROFILE || pathname.startsWith('/user/');
    const isChannelPage = pathname.startsWith('/channel/');
    const isHistoryPage = pathname === ROUTES.HISTORY;
    const isSearchPage = pathname === ROUTES.SEARCH || pathname.startsWith('/search');
    const isLikedPage = pathname === ROUTES.LIKED;
    const isWatchLaterPage = pathname === ROUTES.WATCH_LATER;

    if (isVideoPage) {
        return <VideoPageSkeleton />;
    }
    if (isProfilePage) {
        return <ProfilePageSkeleton />;
    }
    if (isChannelPage) {
        return <ChannelPageSkeleton />;
    }
    if (isHistoryPage) {
        return <HistoryPageSkeleton />;
    }
    if (isSearchPage) {
        return <SearchPageSkeleton />;
    }
    if (isLikedPage || isWatchLaterPage) {
        return <CollectionPageSkeleton />;
    }

    return <HomePageSkeleton />;
}
