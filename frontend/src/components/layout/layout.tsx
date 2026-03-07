import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppHeader from '@components/header/header';
import AppSidebar from '@components/sidebar/sidebar';
import TagView from '@components/tag/view';
import { useVideo } from '@context/useVideo';
import './layout.css';

export default function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const { activeTagView, closeTagView } = useVideo();
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        const isTagViewOpen = activeTagView !== null;
        if (isTagViewOpen) { closeTagView(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return (
        <div className="app-layout">
            <AppHeader onToggleSidebar={() => setSidebarCollapsed(v => !v)} />
            <div className="app-layout__body">
                <AppSidebar collapsed={sidebarCollapsed} />
                <main className="app-layout__content">
                    {activeTagView ? <TagView /> : <Outlet />}
                </main>
            </div>
        </div>
    );
}
