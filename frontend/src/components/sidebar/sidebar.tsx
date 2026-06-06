import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { NavLink, useMatch, type NavLinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Clapperboard, History, ThumbsUp, User, ListVideo, Clock, Compass, Rss, Bell, ChevronDown } from 'lucide-react';
import { ROUTES, cn, videoUrl, TagColors, isWithinDays, loadFromStorage, isObject, STORAGE_KEYS } from '@utils';
import { Tooltip, Avatar } from '@ui';
import './sidebar.css';
import { useSubscriptions, useSubscription, useVideo, useAuth, usePlaylist, useClickOutside } from '@hooks';
import { useAppSelector } from '@store';
import { selectWatchedTagFrequency } from '@store/videoSelectors';
import { selectNotificationsUnreadCount } from '@store/notificationsSelectors';
import { selectRecentChannels } from '@store/recentChannelsSelectors';
import { domain } from '@domain';
import PreferencesPanel from '@components/preferences/preferences';
import NotificationsPanel from '@components/notifications/panel';
import type { Video, Tag, ChannelId } from '@models';

/**
 * Wrapper com forwardRef para que o Radix Tooltip (asChild / Slot) consiga
 * injetar o ref e os event handlers sem tocar no `className` do NavLink.
 * O Slot itera apenas sobre as props do SidebarLink — que não inclui className —
 * então a função `({ isActive }) => string` interna do NavLink nunca é corrompida.
 */
const SidebarLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
    ({ to, end, children, ...rest }, ref) => (
        <NavLink
            ref={ref}
            to={to}
            end={end}
            className={({ isActive }) =>
                ['app-sidebar__item', isActive ? 'app-sidebar__item--active' : '']
                    .filter(Boolean)
                    .join(' ')
            }
            {...rest}
        >
            {children}
        </NavLink>
    ),
);

const MAIN_NAV = [
    { to: ROUTES.HOME, icon: Home, labelKey: 'nav.home', end: true },
    { to: ROUTES.SHORTS, icon: Clapperboard, labelKey: 'nav.shorts', end: false },
] as const;

const EXPLORE_NAV = [
    { to: ROUTES.RECOMMENDED, icon: Compass, labelKey: 'nav.recommended', end: false, requiresAuth: false },
    { to: ROUTES.SUBSCRIPTIONS_FEED, icon: Rss, labelKey: 'nav.subscriptions_feed', end: true, requiresAuth: true },
] as const;

const YOU_NAV = [
    { to: ROUTES.HISTORY, icon: History, labelKey: 'nav.history', end: false },
    { to: ROUTES.PLAYLISTS, icon: ListVideo, labelKey: 'nav.playlists', end: false },
    { to: ROUTES.WATCH_LATER, icon: Clock, labelKey: 'nav.watch_later', end: false },
    { to: ROUTES.LIKED, icon: ThumbsUp, labelKey: 'nav.liked_videos', end: false },
    { to: ROUTES.PROFILE, icon: User, labelKey: 'nav.your_videos', end: false },
] as const;

interface SidebarItemProps {
    item: { to: string; icon: React.ElementType; labelKey: string; end: boolean }
}

function SidebarItem({ item }: SidebarItemProps) {
    const { t } = useTranslation();
    const match = useMatch(item.end ? { path: item.to, end: true } : { path: item.to });
    const isActive = match !== null;
    const Icon = item.icon;

    return (
        <li key={item.to}>
            <Tooltip content={t(item.labelKey)} side="right">
                <SidebarLink to={item.to} end={item.end} aria-label={t(item.labelKey)}>
                    {isActive && (
                        <>
                            <div className="app-sidebar__active-bg" />
                            <div className="app-sidebar__active-pill" />
                        </>
                    )}
                    <span className="app-sidebar__icon-chip">
                        <Icon size={18} strokeWidth={1.75} className="app-sidebar__icon" />
                    </span>
                    <span className="app-sidebar__label">{t(item.labelKey)}</span>
                </SidebarLink>
            </Tooltip>
        </li>
    );
}

function readCollapsedSections(): Record<string, boolean> {
    return loadFromStorage<Record<string, boolean>>(STORAGE_KEYS.SIDEBAR_SECTIONS, {}, isObject);
}

function writeCollapsedSection(id: string, collapsed: boolean) {
    const current = readCollapsedSections();
    current[id] = collapsed;
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_SECTIONS, JSON.stringify(current));
}

interface SidebarSectionProps {
    id: string;
    label: string;
    railHidden?: boolean;
    children: React.ReactNode;
}

function SidebarSection({ id, label, railHidden, children }: SidebarSectionProps) {
    const [collapsed, setCollapsed] = useState(() => readCollapsedSections()[id] ?? false);

    function handleToggle() {
        setCollapsed(prev => {
            const next = !prev;
            writeCollapsedSection(id, next);
            return next;
        });
    }

    return (
        <div className={cn('app-sidebar__section', railHidden && 'app-sidebar__section--rail-hidden')}>
            <button
                type="button"
                className="app-sidebar__section-header"
                onClick={handleToggle}
                aria-expanded={!collapsed}
            >
                <span className="app-sidebar__section-label">{label}</span>
                <ChevronDown
                    size={14}
                    strokeWidth={2}
                    className={cn('app-sidebar__section-chevron', collapsed && 'app-sidebar__section-chevron--collapsed')}
                />
            </button>
            {!collapsed && children}
        </div>
    );
}

function ShowMoreToggle({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
    const { t } = useTranslation();

    return (
        <button
            type="button"
            className="app-sidebar__show-more"
            onClick={onToggle}
            aria-expanded={expanded}
        >
            <ChevronDown
                size={16}
                strokeWidth={2}
                className={cn('app-sidebar__show-more-icon', expanded && 'app-sidebar__show-more-icon--up')}
            />
            <span>{expanded ? t('nav.show_less') : t('nav.show_more')}</span>
        </button>
    );
}

const MAX_CONTINUE_WATCHING = 4;
const RESUMABLE_MAX_PROGRESS = 95;

const RING_RADIUS = 7;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ progress }: { progress: number }) {
    const offset = RING_CIRCUMFERENCE * (1 - progress / 100);

    return (
        <svg className="app-sidebar__ring" viewBox="0 0 18 18" aria-hidden="true">
            <circle className="app-sidebar__ring-track" cx="9" cy="9" r={RING_RADIUS} />
            <circle
                className="app-sidebar__ring-fill"
                cx="9"
                cy="9"
                r={RING_RADIUS}
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={offset}
            />
        </svg>
    );
}

function ContinueWatchingSection() {
    const { t } = useTranslation();
    const { videos, watchHistory, videoProgress } = useVideo();

    const items = useMemo(() => {
        const result: { video: Video; progress: number }[] = [];
        for (const id of watchHistory) {
            const progress = videoProgress[id] ?? 0;
            const isResumable = progress > 0 && progress < RESUMABLE_MAX_PROGRESS;
            if (!isResumable) {
                continue;
            }

            const video = videos.find(v => v.id === id);
            if (!video) {
                continue;
            }

            result.push({ video, progress });
            if (result.length >= MAX_CONTINUE_WATCHING) {
                break;
            }
        }
        return result;
    }, [videos, watchHistory, videoProgress]);

    const hasItems = items.length > 0;
    if (!hasItems) {
        return null;
    }

    return (
        <SidebarSection id="continue" label={t('nav.continue_watching')} railHidden>
            <ul className="app-sidebar__continue-list">
                {items.map(({ video, progress }) => (
                    <li key={video.id}>
                        <NavLink to={videoUrl(video.id)} className="app-sidebar__continue-item" title={video.title}>
                            <span className="app-sidebar__continue-thumb">
                                <img src={video.thumbnail} alt="" loading="lazy" decoding="async" />
                                <ProgressRing progress={progress} />
                            </span>
                            <span className="app-sidebar__continue-meta">
                                <span className="app-sidebar__continue-title">{video.title}</span>
                                <span className="app-sidebar__continue-channel">{video.channel}</span>
                            </span>
                        </NavLink>
                    </li>
                ))}
            </ul>
        </SidebarSection>
    );
}

const COLLAPSED_SUBSCRIPTIONS = 7;
const NEW_VIDEO_WINDOW_DAYS = 14;

/**
 * Channel ids that published a recent video the user hasn't watched yet — used to
 * surface a "new video" dot on subscribed channels.
 */
function useChannelsWithNewVideos(): Set<string> {
    const { publishedVideos, watchHistory } = useVideo();

    return useMemo(() => {
        const watched = new Set(watchHistory);
        const result = new Set<string>();
        for (const video of publishedVideos) {
            const isRecent = isWithinDays(video.publishedAt, NEW_VIDEO_WINDOW_DAYS);
            const isUnwatched = !watched.has(video.id);
            if (isRecent && isUnwatched) {
                result.add(video.channelId);
            }
        }
        return result;
    }, [publishedVideos, watchHistory]);
}

function SubscriptionsSection() {
    const { t } = useTranslation();
    const { channels, isLoading } = useSubscriptions();
    const newVideoChannels = useChannelsWithNewVideos();
    const [expanded, setExpanded] = useState(false);

    if (isLoading) {
        return null;
    }

    const hasSubscriptions = channels.length > 0;

    if (!hasSubscriptions) {
        return (
            <div className="app-sidebar__section">
                <span className="app-sidebar__section-label">{t('nav.subscriptions')}</span>
                <p className="app-sidebar__empty">{t('nav.no_subscriptions')}</p>
                <NavLink to={ROUTES.HOME} className="app-sidebar__empty-cta">
                    {t('nav.explore_channels')}
                </NavLink>
            </div>
        );
    }

    const isOverflowing = channels.length > COLLAPSED_SUBSCRIPTIONS;
    const visibleChannels = expanded ? channels : channels.slice(0, COLLAPSED_SUBSCRIPTIONS);

    function handleToggleExpanded() {
        setExpanded(prev => !prev);
    }

    return (
        <SidebarSection id="subscriptions" label={t('nav.subscriptions')}>
            <ul className="app-sidebar__list">
                {visibleChannels.map(ch => {
                    const channelPath = ROUTES.USER.replace(':id', ch.uuid);
                    const hasNewVideo = newVideoChannels.has(ch.uuid);
                    return (
                        <li key={ch.uuid}>
                            <Tooltip content={ch.name} side="right">
                                <SidebarLink to={channelPath} end={false} aria-label={ch.name}>
                                    <span className="app-sidebar__icon-chip">
                                        <Avatar name={ch.name} src={ch.avatar} size="sm" />
                                        {hasNewVideo && (
                                            <span className="app-sidebar__dot" aria-label={t('nav.new_videos')} />
                                        )}
                                    </span>
                                    <span className="app-sidebar__label">{ch.name}</span>
                                </SidebarLink>
                            </Tooltip>
                        </li>
                    );
                })}
            </ul>
            {isOverflowing && <ShowMoreToggle expanded={expanded} onToggle={handleToggleExpanded} />}
        </SidebarSection>
    );
}

const COLLAPSED_PLAYLISTS = 7;

function PlaylistsSection() {
    const { t } = useTranslation();
    const { playlists } = usePlaylist();
    const [expanded, setExpanded] = useState(false);

    const userPlaylists = useMemo(
        () => playlists.filter(p => !domain.playlist.isWatchLater(p)),
        [playlists],
    );

    const hasPlaylists = userPlaylists.length > 0;
    if (!hasPlaylists) {
        return null;
    }

    const isOverflowing = userPlaylists.length > COLLAPSED_PLAYLISTS;
    const visiblePlaylists = expanded ? userPlaylists : userPlaylists.slice(0, COLLAPSED_PLAYLISTS);

    function handleToggleExpanded() {
        setExpanded(prev => !prev);
    }

    return (
        <SidebarSection id="playlists" label={t('nav.playlists')} railHidden>
            <ul className="app-sidebar__list">
                {visiblePlaylists.map(p => {
                    const palette = TagColors.palette(p.name);
                    const to = `${ROUTES.PLAYLISTS}?open=${p.id}`;
                    return (
                        <li key={p.id}>
                            <NavLink to={to} className="app-sidebar__playlist" title={p.name}>
                                <span
                                    className="app-sidebar__playlist-chip"
                                    style={{ background: palette.bg, color: palette.color }}
                                    aria-hidden="true"
                                >
                                    <ListVideo size={13} strokeWidth={2} />
                                </span>
                                <span className="app-sidebar__playlist-name">{p.name}</span>
                                <span className="app-sidebar__playlist-count">{p.videoIds.length}</span>
                            </NavLink>
                        </li>
                    );
                })}
            </ul>
            {isOverflowing && <ShowMoreToggle expanded={expanded} onToggle={handleToggleExpanded} />}
        </SidebarSection>
    );
}

const MAX_TOPICS = 6;

function TopicsSection() {
    const { t } = useTranslation();
    const { openTagView } = useVideo();
    const tagFrequency = useAppSelector(selectWatchedTagFrequency);

    const topTags = useMemo(
        () => Array.from(tagFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, MAX_TOPICS)
            .map(([tag]) => tag),
        [tagFrequency],
    );

    const hasTopics = topTags.length > 0;
    if (!hasTopics) {
        return null;
    }

    function handleOpen(tag: Tag) {
        openTagView(tag, null);
    }

    return (
        <SidebarSection id="topics" label={t('nav.topics')} railHidden>
            <div className="app-sidebar__topics">
                {topTags.map(tag => {
                    const palette = TagColors.palette(tag);
                    return (
                        <button
                            key={tag}
                            type="button"
                            className="app-sidebar__topic"
                            style={{ background: palette.bg, color: palette.color }}
                            onClick={() => handleOpen(tag)}
                            aria-label={tag}
                        >
                            {tag}
                        </button>
                    );
                })}
            </div>
        </SidebarSection>
    );
}

function SidebarNotifications() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const unreadCount = useAppSelector(selectNotificationsUnreadCount);
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLLIElement>(null);

    const handleClose = useCallback(() => setOpen(false), []);
    useClickOutside(containerRef, handleClose, open);

    if (user === null) {
        return null;
    }

    const hasBadge = unreadCount > 0;
    const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

    function handleToggle() {
        setOpen(prev => !prev);
    }

    return (
        <li className="app-sidebar__notif" ref={containerRef}>
            <Tooltip content={t('notifications.bell.label')} side="right">
                <button
                    type="button"
                    className="app-sidebar__item"
                    onClick={handleToggle}
                    aria-label={t('notifications.bell.label')}
                    aria-expanded={open}
                    aria-haspopup="dialog"
                >
                    <span className="app-sidebar__icon-chip">
                        <Bell size={18} strokeWidth={1.75} className="app-sidebar__icon" />
                        {hasBadge && <span className="app-sidebar__notif-badge">{badgeLabel}</span>}
                    </span>
                    <span className="app-sidebar__label">{t('notifications.bell.label')}</span>
                </button>
            </Tooltip>
            {open && (
                <div className="app-sidebar__notif-panel">
                    <NotificationsPanel onClose={handleClose} />
                </div>
            )}
        </li>
    );
}

function RecentChannelsSection() {
    const { t } = useTranslation();
    const recent = useAppSelector(selectRecentChannels);
    const { subscribedSet } = useSubscription();

    const channels = useMemo(
        () => recent.filter(c => !subscribedSet.has(c.uuid as ChannelId)),
        [recent, subscribedSet],
    );

    const hasChannels = channels.length > 0;
    if (!hasChannels) {
        return null;
    }

    return (
        <SidebarSection id="recent" label={t('nav.recent_channels')} railHidden>
            <ul className="app-sidebar__list">
                {channels.map(ch => {
                    const channelPath = ROUTES.USER.replace(':id', ch.uuid);
                    return (
                        <li key={ch.uuid}>
                            <Tooltip content={ch.name} side="right">
                                <SidebarLink to={channelPath} end={false} aria-label={ch.name}>
                                    <span className="app-sidebar__icon-chip">
                                        <Avatar name={ch.name} size="sm" />
                                    </span>
                                    <span className="app-sidebar__label">{ch.name}</span>
                                </SidebarLink>
                            </Tooltip>
                        </li>
                    );
                })}
            </ul>
        </SidebarSection>
    );
}

function ExploreSection() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isAuthenticated = user !== null;

    const items = EXPLORE_NAV.filter(item => !item.requiresAuth || isAuthenticated);

    return (
        <div className="app-sidebar__section">
            <span className="app-sidebar__section-label">{t('nav.explore')}</span>
            <ul className="app-sidebar__list">
                {items.map(item => <SidebarItem key={item.to} item={item} />)}
            </ul>
        </div>
    );
}

function UserCard() {
    const { t } = useTranslation();
    const { user } = useAuth();

    if (user === null) {
        return null;
    }

    return (
        <NavLink to={ROUTES.PROFILE} className="app-sidebar__user" title={user.name}>
            <span className="app-sidebar__icon-chip">
                <Avatar name={user.name} src={user.avatar} size="sm" />
            </span>
            <span className="app-sidebar__user-meta">
                <span className="app-sidebar__user-name">{user.name}</span>
                <span className="app-sidebar__user-link">{t('nav.view_profile')}</span>
            </span>
        </NavLink>
    );
}

interface AppSidebarProps {
    open: boolean;
    permanent?: boolean;
    collapsed?: boolean;
    hidden?: boolean;
    onClose?: () => void;
}

export default function AppSidebar({ open, permanent, collapsed, hidden, onClose }: AppSidebarProps) {
    const { t } = useTranslation();
    const isVisible = permanent || open;

    useEffect(() => {
        if (!open || permanent) {
            return;
        }
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open, permanent, onClose]);

    return (
        <nav
            className={cn(
                'app-sidebar',
                isVisible && 'app-sidebar--open',
                permanent && 'app-sidebar--permanent',
                collapsed && 'app-sidebar--rail',
                hidden && 'app-sidebar--hidden',
            )}
            aria-label={t('nav.aria_label')}
            aria-hidden={!isVisible}
        >
            <div className="app-sidebar__inner">
                <UserCard />

                <ul className="app-sidebar__list">
                    {MAIN_NAV.map(item => <SidebarItem key={item.to} item={item} />)}
                    <SidebarNotifications />
                </ul>

                <ExploreSection />

                <SidebarSection id="you" label={t('nav.you')}>
                    <ul className="app-sidebar__list">
                        {YOU_NAV.map(item => <SidebarItem key={item.to} item={item} />)}
                    </ul>
                </SidebarSection>

                <PlaylistsSection />

                <ContinueWatchingSection />

                <TopicsSection />

                <SubscriptionsSection />

                <RecentChannelsSection />

                <div className="app-sidebar__footer app-sidebar__section--rail-hidden">
                    <PreferencesPanel inline />
                </div>
            </div>
        </nav>
    );
}
