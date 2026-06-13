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
import ScrollTopButton from '@components/ui/scrollTop/scrollTop';
import PageSkeleton from '@components/layout/pageSkeleton';
import { useAppDispatch, useAppSelector } from '@store';
import { videoUiActions } from '@store/videoUiSlice';
import { useSearch } from '@context/search';
import './layout.css';
import { useKeyboardShortcuts, useScrollRestoration, useMediaQuery } from '@hooks';
import { ROUTES, cn, STORAGE_KEYS, APP_EVENTS } from '@utils';

export default function AppLayout() {
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(() => localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED) === 'true');

    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const dispatch = useAppDispatch();
    const activeTagView = useAppSelector(s => s.videoUi.activeTagView);
    const theaterMode = useAppSelector(s => s.playback.theaterMode);
    const { pathname } = useLocation();
    const isFullHeightPage = pathname === ROUTES.SHORTS;
    const isVideoPage = pathname === ROUTES.VIDEO;
    const isPermanentSidebar = !isVideoPage;
    // Theater mode is persisted, so only hide the sidebar for it on the watch page.
    const isSidebarHiddenForTheater = theaterMode && isVideoPage;
    const isMediumScreen = useMediaQuery('(max-width: 1280px)');
    const isRail = collapsed || isMediumScreen;
    useScrollRestoration();

    const handleToggleSidebar = useCallback(() => {
        if (isPermanentSidebar) {
            setCollapsed(prev => {
                const next = !prev;
                localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
                return next;
            });
            return;
        }

        setSidebarOpen(prev => !prev);
    }, [isPermanentSidebar]);

    const handleCloseSidebar = useCallback(() => {
        setSidebarOpen(false);
    }, []);

    useEffect(() => {
        const isTagViewOpen = activeTagView !== null;
        if (isTagViewOpen) {
            dispatch(videoUiActions.closeTagView());
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const { focusSearch } = useSearch();

    const handleOpenShortcuts = useCallback(() => {
        setShortcutsOpen(true);
    }, []);

    useEffect(() => {
        function onOpenShortcuts() {
            setShortcutsOpen(true);
        }

        window.addEventListener(APP_EVENTS.OPEN_SHORTCUTS, onOpenShortcuts);
        return () => window.removeEventListener(APP_EVENTS.OPEN_SHORTCUTS, onOpenShortcuts);
    }, []);

    const handleOpenUpload = useCallback(() => {
        dispatch(videoUiActions.openUploadModal());
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
                <AppSidebar
                    open={sidebarOpen}
                    permanent={isPermanentSidebar}
                    collapsed={isPermanentSidebar && isRail}
                    hidden={isSidebarHiddenForTheater}
                    onClose={handleCloseSidebar}
                />
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
            <ScrollTopButton />
            {!isVideoPage && <MiniPlayer />}
            <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
            <ToastContainer />
        </div>
    );
}
