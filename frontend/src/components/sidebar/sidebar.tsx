import React from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, History, ListVideo, Clock, ThumbsUp, User } from 'lucide-react';
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
    { to: ROUTES.HOME, icon: Home, labelKey: 'nav.home', end: true },
] as const;

const YOU_NAV = [
    { to: ROUTES.HISTORY,     icon: History,   labelKey: 'nav.history',      end: false },
    { to: ROUTES.PLAYLISTS,   icon: ListVideo,  labelKey: 'nav.playlists',    end: false },
    { to: ROUTES.WATCH_LATER, icon: Clock,      labelKey: 'nav.watch_later',  end: false },
    { to: ROUTES.LIKED,       icon: ThumbsUp,   labelKey: 'nav.liked_videos', end: false },
    { to: ROUTES.PROFILE,     icon: User,       labelKey: 'nav.your_videos',  end: false },
] as const;

interface AppSidebarProps {
    collapsed: boolean;
}

export default function AppSidebar({ collapsed }: AppSidebarProps) {
    const { t } = useTranslation();

    const renderItem = (item: { to: string; icon: React.ElementType; labelKey: string; end: boolean }) => {
        const Icon = item.icon;
        return (
            <li key={item.to}>
                <Tooltip content={t(item.labelKey)} side="right">
                    <SidebarLink to={item.to} end={item.end} aria-label={t(item.labelKey)}>
                        <span className="app-sidebar__icon-chip">
                            <Icon size={18} strokeWidth={1.75} className="app-sidebar__icon" />
                        </span>
                        <span className="app-sidebar__label">{t(item.labelKey)}</span>
                    </SidebarLink>
                </Tooltip>
            </li>
        );
    };

    return (
        <nav
            className={`app-sidebar${collapsed ? ' app-sidebar--collapsed' : ''}`}
            aria-label={t('nav.aria_label')}
        >
            <ul className="app-sidebar__list">
                {MAIN_NAV.map(renderItem)}
            </ul>

            <div className="app-sidebar__section">
                <span className="app-sidebar__section-label">{t('nav.you')}</span>
                <ul className="app-sidebar__list">
                    {YOU_NAV.map(renderItem)}
                </ul>
            </div>
        </nav>
    );
}
