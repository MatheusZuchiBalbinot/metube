import React, { useMemo } from 'react';
import { NavLink, useMatch, type NavLinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, Clapperboard, History, ThumbsUp, User, ListVideo } from 'lucide-react';
import { ROUTES } from '@utils/routes';
import { useAppSelector } from '@store';
import { Tooltip, Avatar } from '@ui';
import './sidebar.css';
import { useSubscription } from '@hooks';

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

const YOU_NAV = [
    { to: ROUTES.HISTORY, icon: History, labelKey: 'nav.history', end: false },
    { to: ROUTES.PLAYLISTS, icon: ListVideo, labelKey: 'nav.playlists', end: false },
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

function SubscriptionsSection() {
    const { t } = useTranslation();
    const { subscribedSet } = useSubscription();
    const videos = useAppSelector(s => s.video.videos);

    const channels = useMemo(() => {
        const seen = new Set<string>();
        const result: { id: string; name: string }[] = [];
        for (const video of videos) {
            const isChannelSubscribed = subscribedSet.has(video.channelId);
            const isAlreadySeen = seen.has(video.channelId);
            if (!isChannelSubscribed || isAlreadySeen) {
                continue;
            }
            seen.add(video.channelId);
            result.push({ id: video.channelId, name: video.channel });
        }
        return result;
    }, [videos, subscribedSet]);

    const hasSubscriptions = channels.length > 0;
    if (!hasSubscriptions) {
        return null;
    }

    return (
        <div className="app-sidebar__section">
            <span className="app-sidebar__section-label">{t('nav.subscriptions')}</span>
            <ul className="app-sidebar__list">
                {channels.map(ch => {
                    const channelPath = ROUTES.CHANNEL.replace(':id', ch.id);
                    return (
                        <li key={ch.id}>
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
        </div>
    );
}

interface AppSidebarProps {
    collapsed: boolean;
    hidden?: boolean;
}

export default function AppSidebar({ collapsed, hidden }: AppSidebarProps) {
    const { t } = useTranslation();

    return (
        <nav
            className={['app-sidebar', collapsed ? 'app-sidebar--collapsed' : '', hidden ? 'app-sidebar--hidden' : ''].filter(Boolean).join(' ')}
            aria-label={t('nav.aria_label')}
        >
            <ul className="app-sidebar__list">
                {MAIN_NAV.map(item => <SidebarItem key={item.to} item={item} />)}
            </ul>

            <div className="app-sidebar__section">
                <span className="app-sidebar__section-label">{t('nav.you')}</span>
                <ul className="app-sidebar__list">
                    {YOU_NAV.map(item => <SidebarItem key={item.to} item={item} />)}
                </ul>
            </div>

            <SubscriptionsSection />
        </nav>
    );
}
