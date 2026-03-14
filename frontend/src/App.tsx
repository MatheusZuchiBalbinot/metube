import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@store';
import { fetchMe, authActions } from '@store/authSlice';
import { APP_EVENTS } from '@utils/events';
import Guard from '@components/guard/guard';
import AppLayout from '@components/layout/layout';
import UploadModal from '@components/upload/modal';
import LoginPage from '@pages/login/login';
import HomePage from '@pages/home/home';
import HistoryPage from '@pages/history/history';
import PlaylistsPage from '@pages/playlists/playlists';
import WatchLaterPage from '@pages/watch/later';
import LikedPage from '@pages/liked/liked';
import ProfilePage from '@pages/profile/profile';
import VideoPage from '@pages/video/video';
import SearchPage from '@pages/search/search';
import ChannelPage from '@pages/channel/channel';
import ShortsPage from '@pages/shorts/shorts';
import { ROUTES } from '@utils/routes';
import { TooltipProvider } from '@ui';

function AppInit({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(fetchMe());

        function onSessionExpired(e: Event) {
            const message = (e as CustomEvent<{ message: string }>).detail.message;
            dispatch(authActions.sessionExpired(message));
        }

        window.addEventListener(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
        return () => window.removeEventListener(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
    }, [dispatch]);

    return <>{children}</>;
}

export default function App() {
    return (
        <Provider store={store}>
            <BrowserRouter>
                <AppInit>
                    <TooltipProvider>
                        <UploadModal />
                        <Routes>
                            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                            <Route element={<Guard><AppLayout /></Guard>}>
                                <Route path={ROUTES.HOME}   element={<HomePage />} />
                                <Route path={ROUTES.SHORTS} element={<ShortsPage />} />
                                <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
                                <Route path={ROUTES.PLAYLISTS} element={<PlaylistsPage />} />
                                <Route path={ROUTES.WATCH_LATER} element={<WatchLaterPage />} />
                                <Route path={ROUTES.LIKED} element={<LikedPage />} />
                                <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
                                <Route path={ROUTES.USER} element={<ProfilePage />} />
                                <Route path={ROUTES.VIDEO} element={<VideoPage />} />
                                <Route path={ROUTES.SEARCH} element={<SearchPage />} />
                                <Route path={ROUTES.CHANNEL} element={<ChannelPage />} />
                            </Route>
                            <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                        </Routes>
                    </TooltipProvider>
                </AppInit>
            </BrowserRouter>
        </Provider>
    );
}
