import React from 'react';
import { NavLink, useMatch, type NavLinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Home, Clapperboard, History, ListVideo, Clock, ThumbsUp, User } from 'lucide-react';
import { ROUTES } from '@utils/routes';
import { Tooltip } from '@ui';
import './sidebar.css';

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
    { to: ROUTES.HOME,   icon: Home,         labelKey: 'nav.home',   end: true },
    { to: ROUTES.SHORTS, icon: Clapperboard, labelKey: 'nav.shorts', end: false },
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
                            <motion.div
                                layoutId="sidebar-active-bg"
                                className="app-sidebar__active-bg"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
                            <motion.div
                                layoutId="sidebar-active-pill"
                                className="app-sidebar__active-pill"
                                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                            />
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
        </nav>
    );
}
