import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import './sidebar.css';
import { SidebarItem, ExploreSection, UserCard, MAIN_NAV, YOU_NAV } from './sidebarNav';
import { SidebarSection } from './sidebarSection';
import {
    ContinueWatchingSection,
    PlaylistsSection,
    RecentChannelsSection,
    SubscriptionsSection,
    TopicsSection,
} from './sidebarSections';

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
            </div>
        </nav>
    );
}
