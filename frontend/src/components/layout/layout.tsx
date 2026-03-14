import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ROUTES } from '@utils/routes';
import AppHeader from '@components/header/header';
import AppSidebar from '@components/sidebar/sidebar';
import TagView from '@components/tag/view';
import MiniPlayer from '@components/mini/player';
import ShortcutsModal from '@components/shortcuts/modal';
import ToastContainer from '@components/ui/toast/toast';
import NavProgress from '@components/ui/navProgress/navProgress';
import { useVideo } from '@context/useVideo';
import { useAppSelector } from '@store';
import { useKeyboardShortcuts } from '@utils/useKeyboardShortcuts';
import './layout.css';

export default function AppLayout() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [shortcutsOpen, setShortcutsOpen] = useState(false);
    const { activeTagView, closeTagView, openUploadModal } = useVideo();
    const theaterMode = useAppSelector(state => state.video.theaterMode);
    const { pathname } = useLocation();
    const isFullHeightPage = pathname === ROUTES.SHORTS;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });

        const isTagViewOpen = activeTagView !== null;
        if (isTagViewOpen) {
            closeTagView();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const handleFocusSearch = useCallback(() => {
        const input = document.querySelector<HTMLInputElement>('.app-header__search-input');
        if (input) {
            input.focus();
            input.select();
        }
    }, []);

    const handleOpenShortcuts = useCallback(() => {
        setShortcutsOpen(true);
    }, []);

    useKeyboardShortcuts({
        onOpenUpload: openUploadModal,
        onOpenShortcuts: handleOpenShortcuts,
        onFocusSearch: handleFocusSearch,
    });

    return (
        <div className="app-layout">
            <div className="app-layout__orb" aria-hidden="true" />
            <AppHeader onToggleSidebar={() => setSidebarCollapsed(v => !v)} />
            <div className="app-layout__body">
                <AppSidebar collapsed={sidebarCollapsed} hidden={theaterMode} />
                <main className="app-layout__content">
                    <AnimatePresence mode="sync" initial={false}>
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1, ease: 'easeInOut' }}
                            style={isFullHeightPage ? { height: '100%' } : undefined}
                        >
                            {activeTagView ? <TagView /> : <Outlet />}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
            <NavProgress />
            <MiniPlayer />
            <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
            <ToastContainer />
        </div>
    );
}
