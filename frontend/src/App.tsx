import React, { Suspense, useEffect } from 'react';
import './app.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@store';
import { fetchMe, authActions } from '@store/authSlice';
import { APP_EVENTS } from '@utils/events';
import { initCrossTabSync } from '@store/crossTabSync';
import Guard from '@components/guard/guard';
import { SearchProvider } from '@context/searchContext';
import AppLayout from '@components/layout/layout';
import Spinner from '@components/ui/spinner/spinner';

const LoginPage = React.lazy(() => import('@pages/login/login'));
const UploadModal = React.lazy(() => import('@components/upload/modal'));
import { ROUTES } from '@utils/routes';
import { TooltipProvider } from '@ui';

const HomePage = React.lazy(() => import('@pages/home/home'));
const HistoryPage = React.lazy(() => import('@pages/history/history'));
const PlaylistsPage = React.lazy(() => import('@pages/playlists/playlists'));
const WatchLaterPage = React.lazy(() => import('@pages/watch/later'));
const LikedPage = React.lazy(() => import('@pages/liked/liked'));
const ProfilePage = React.lazy(() => import('@pages/profile/profile'));
const VideoPage = React.lazy(() => import('@pages/video/video'));
const SearchPage = React.lazy(() => import('@pages/search/search'));
const ChannelPage = React.lazy(() => import('@pages/channel/channel'));
const ShortsPage = React.lazy(() => import('@pages/shorts/shorts'));
const NotFoundPage = React.lazy(() => import('@pages/notFound/notFound'));

const PROTECTED_ROUTES: { path: string; Page: React.LazyExoticComponent<() => React.ReactElement> }[] = [
    { path: ROUTES.HOME,        Page: HomePage },
    { path: ROUTES.SHORTS,      Page: ShortsPage },
    { path: ROUTES.HISTORY,     Page: HistoryPage },
    { path: ROUTES.PLAYLISTS,   Page: PlaylistsPage },
    { path: ROUTES.WATCH_LATER, Page: WatchLaterPage },
    { path: ROUTES.LIKED,       Page: LikedPage },
    { path: ROUTES.PROFILE,     Page: ProfilePage },
    { path: ROUTES.USER,        Page: ProfilePage },
    { path: ROUTES.VIDEO,       Page: VideoPage },
    { path: ROUTES.SEARCH,      Page: SearchPage },
    { path: ROUTES.CHANNEL,     Page: ChannelPage },
];

class RouteErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    render() {
        const { hasError } = this.state;
        if (hasError) {
            return (
                <div className="route-error">
                    <p>Something went wrong.</p>
                    <button onClick={() => window.location.reload()}>Try again</button>
                </div>
            );
        }
        return this.props.children;
    }
}

function PageSpinner() {
    return <Spinner fullPage />;
}

function AppInit({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchMe());

        function isSessionExpiredEvent(e: Event): e is CustomEvent<{ message: string }> {
            return e instanceof CustomEvent && typeof (e.detail as { message?: unknown })?.message === 'string';
        }

        function onSessionExpired(e: Event) {
            const isValid = isSessionExpiredEvent(e);
            if (!isValid) return;
            dispatch(authActions.sessionExpired(e.detail.message));
        }

        window.addEventListener(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
        const stopCrossTabSync = initCrossTabSync(dispatch);

        return () => {
            window.removeEventListener(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
            stopCrossTabSync();
        };
    }, [dispatch]);

    useEffect(() => {
        function onVisibilityChange() {
            const isHidden = document.visibilityState === 'hidden';
            document.body.classList.toggle('page-hidden', isHidden);
        }

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    return <>{children}</>;
}

export default function App() {
    return (
        <Provider store={store}>
            <BrowserRouter>
                <AppInit>
                    <SearchProvider>
                    <TooltipProvider delayDuration={150}>
                        <Suspense fallback={null}>
                            <UploadModal />
                        </Suspense>
                        <RouteErrorBoundary>
                            <Routes>
                                <Route path={ROUTES.LOGIN} element={<Suspense fallback={<PageSpinner />}><LoginPage /></Suspense>} />
                                <Route element={<Guard><AppLayout /></Guard>}>
                                    {PROTECTED_ROUTES.map(({ path, Page }) => (
                                        <Route key={path} path={path} element={<Page />} />
                                    ))}
                                </Route>
                                <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
                            </Routes>
                        </RouteErrorBoundary>
                    </TooltipProvider>
                    </SearchProvider>
                </AppInit>
            </BrowserRouter>
        </Provider>
    );
}

