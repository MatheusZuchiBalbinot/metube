import React from 'react';
import { NavLink, useMatch, type NavLinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Clapperboard, History, ThumbsUp, User, ListVideo, Clock, Compass, Rss } from 'lucide-react';
import { ROUTES } from '@utils';
import { Tooltip, Avatar } from '@ui';
import { useAuth } from '@hooks';

/**
 * forwardRef wrapper so the Radix Tooltip (asChild / Slot) can inject the ref and
 * event handlers without touching the NavLink's `className`. The Slot only iterates
 * over SidebarLink's props — which excludes className — so NavLink's internal
 * `({ isActive }) => string` function is never clobbered.
 */
export const SidebarLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
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

export const MAIN_NAV = [
    { to: ROUTES.HOME, icon: Home, labelKey: 'nav.home', end: true },
    { to: ROUTES.SHORTS, icon: Clapperboard, labelKey: 'nav.shorts', end: false },
] as const;

export const EXPLORE_NAV = [
    { to: ROUTES.RECOMMENDED, icon: Compass, labelKey: 'nav.recommended', end: false, requiresAuth: false },
    { to: ROUTES.SUBSCRIPTIONS_FEED, icon: Rss, labelKey: 'nav.subscriptions_feed', end: true, requiresAuth: true },
] as const;

export const YOU_NAV = [
    { to: ROUTES.HISTORY, icon: History, labelKey: 'nav.history', end: false },
    { to: ROUTES.PLAYLISTS, icon: ListVideo, labelKey: 'nav.playlists', end: false },
    { to: ROUTES.WATCH_LATER, icon: Clock, labelKey: 'nav.watch_later', end: false },
    { to: ROUTES.LIKED, icon: ThumbsUp, labelKey: 'nav.liked_videos', end: false },
    { to: ROUTES.PROFILE, icon: User, labelKey: 'nav.your_videos', end: false },
] as const;

interface SidebarItemProps {
    item: { to: string; icon: React.ElementType; labelKey: string; end: boolean }
}

export function SidebarItem({ item }: SidebarItemProps) {
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
                        <Icon size={16} strokeWidth={1.75} className="app-sidebar__icon" />
                    </span>
                    <span className="app-sidebar__label">{t(item.labelKey)}</span>
                </SidebarLink>
            </Tooltip>
        </li>
    );
}

export function ExploreSection() {
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

export function UserCard() {
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
