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
import { useSearch } from '@context/search';
import './layout.css';

export default function AppLayout() {
    const { t } = useTranslation();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const dispatch = useAppDispatch();
    const activeTagView = useAppSelector(s => s.video.activeTagView);
    const theaterMode = useAppSelector(s => s.video.theaterMode);
    const { pathname } = useLocation();
    const isFullHeightPage = pathname === ROUTES.SHORTS;
    const isVideoPage = pathname.startsWith('/video/');
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });

        const isTagViewOpen = activeTagView !== null;
        if (isTagViewOpen) {
            dispatch(videoActions.closeTagView());
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const { focusSearch } = useSearch();
    const handleFocusSearch = useCallback(() => focusSearch(), [focusSearch]);

    const handleOpenShortcuts = useCallback(() => {
        setShortcutsOpen(true);
    }, []);

    const handleOpenUpload = useCallback(() => {
        dispatch(videoActions.openUploadModal());
    }, [dispatch]);

    useKeyboardShortcuts({
        onOpenUpload: handleOpenUpload,
        onOpenShortcuts: handleOpenShortcuts,
        onFocusSearch: handleFocusSearch,
    });

    return (
        <div className="app-layout">
            <a href="#main-content" className="skip-link">{t('nav.skip_to_content')}</a>
            <div className="app-layout__bg" aria-hidden="true">
                <div className="app-layout__bg-orb" />
            </div>
            <AppHeader onToggleSidebar={() => setSidebarCollapsed(v => !v)} />
            <div className="app-layout__body">
                <AppSidebar collapsed={sidebarCollapsed} hidden={theaterMode} />
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
