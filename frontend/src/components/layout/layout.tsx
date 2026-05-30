import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppHeader from '@components/header/header';
import AppSidebar from '@components/sidebar/sidebar';
import TagView from '@components/tag/view';
import MiniPlayer from '@components/mini/player';
import ShortcutsModal from '@components/shortcuts/modal';
import ToastContainer from '@components/ui/toast/toast';
import NavProgress from '@components/ui/navProgress/navProgress';
import PageSkeleton from '@components/layout/pageSkeleton';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions } from '@store/videoSlice';
import { useSearch } from '@context/search';
import './layout.css';
import { useKeyboardShortcuts, useScrollRestoration } from '@hooks';
import { ROUTES, cn } from '@utils';

export default function AppLayout() {
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleToggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const handleCloseSidebar = useCallback(() => {
        setSidebarOpen(false);
    }, []);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const dispatch = useAppDispatch();
    const activeTagView = useAppSelector(s => s.video.activeTagView);
    const theaterMode = useAppSelector(s => s.video.theaterMode);
    const { pathname } = useLocation();
    const isFullHeightPage = pathname === ROUTES.SHORTS;
    const isVideoPage = pathname === ROUTES.VIDEO;
    const isPermanentSidebar = !isVideoPage;
    useScrollRestoration();

    useEffect(() => {
        const isTagViewOpen = activeTagView !== null;
        if (isTagViewOpen) {
            dispatch(videoActions.closeTagView());
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const { focusSearch } = useSearch();

    const handleOpenShortcuts = useCallback(() => {
        setShortcutsOpen(true);
    }, []);

    const handleOpenUpload = useCallback(() => {
        dispatch(videoActions.openUploadModal());
    }, [dispatch]);

    useKeyboardShortcuts({
        onOpenUpload: handleOpenUpload,
        onOpenShortcuts: handleOpenShortcuts,
        onFocusSearch: focusSearch,
    });

    return (
        <div className="app-layout">
            <a href="#main-content" className="skip-link">{t('nav.skip_to_content')}</a>
            <AppHeader onToggleSidebar={handleToggleSidebar} />
            <div className="app-layout__body">
                <AppSidebar open={sidebarOpen} permanent={isPermanentSidebar} hidden={theaterMode} onClose={handleCloseSidebar} />
                {sidebarOpen && !isPermanentSidebar && (
                    <button
                        type="button"
                        className="app-layout__sidebar-backdrop"
                        aria-label={t('nav.close_sidebar', 'Close menu')}
                        onClick={handleCloseSidebar}
                    />
                )}
                <main id="main-content" className={cn('app-layout__content', isFullHeightPage && 'app-layout__content--full')}>
                    <Suspense fallback={<PageSkeleton pathname={pathname} />}>
                        {activeTagView ? <TagView /> : <Outlet />}
                    </Suspense>
                </main>
            </div>
            <NavProgress />
            {!isVideoPage && <MiniPlayer />}
            <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
            <ToastContainer />
        </div>
    );
}
