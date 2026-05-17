import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '@utils/routes';
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
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { useScrollRestoration } from '@hooks/useScrollRestoration';
import { useSearch } from '@context/search';
import { STORAGE_KEYS } from '@utils/storageKeys';
import './layout.css';

function getInitialSidebarCollapsed(): boolean {
    const hasWindow = typeof window !== 'undefined';

    if (!hasWindow) {
        return true;
    }

    const stored = window.localStorage.getItem(STORAGE_KEYS.SIDEBAR_COLLAPSED);
    const hasStoredValue = stored !== null;

    if (hasStoredValue) {
        return stored === 'true';
    }

    return true;
}

export default function AppLayout() {
    const { t } = useTranslation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => getInitialSidebarCollapsed());

    const handleToggleSidebar = useCallback(() => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            const hasWindow = typeof window !== 'undefined';

            if (hasWindow) {
                window.localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, String(next));
            }

            return next;
        });
    }, []);

    const handleCloseSidebar = useCallback(() => {
        setSidebarCollapsed(() => {
            const hasWindow = typeof window !== 'undefined';

            if (hasWindow) {
                window.localStorage.setItem(STORAGE_KEYS.SIDEBAR_COLLAPSED, 'true');
            }

            return true;
        });
    }, []);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const dispatch = useAppDispatch();
    const activeTagView = useAppSelector(s => s.video.activeTagView);
    const theaterMode = useAppSelector(s => s.video.theaterMode);
    const { pathname } = useLocation();
    const isFullHeightPage = pathname === ROUTES.SHORTS;
    const isVideoPage = pathname === ROUTES.VIDEO;
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
                <AppSidebar collapsed={sidebarCollapsed} hidden={theaterMode} />
                {!sidebarCollapsed && (
                    <button
                        type="button"
                        className="app-layout__sidebar-backdrop"
                        aria-label={t('nav.close_sidebar', 'Close menu')}
                        onClick={handleCloseSidebar}
                    />
                )}
                <main id="main-content" className={['app-layout__content', isFullHeightPage ? 'app-layout__content--full' : ''].filter(Boolean).join(' ')}>
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
