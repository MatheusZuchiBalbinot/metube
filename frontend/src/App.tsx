import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@context/themeContext';
import { AuthProvider } from '@context/authContext';
import { VideoProvider } from '@context/videoContext';
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
import { ROUTES } from '@utils/routes';
import { TooltipProvider } from '@ui';

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <VideoProvider>
                        <TooltipProvider>
                            <UploadModal />
                            <Routes>
                                <Route path={ROUTES.LOGIN} element={<LoginPage />} />
                                <Route element={<Guard><AppLayout /></Guard>}>
                                    <Route path={ROUTES.HOME} element={<HomePage />} />
                                    <Route path={ROUTES.HISTORY} element={<HistoryPage />} />
                                    <Route path={ROUTES.PLAYLISTS} element={<PlaylistsPage />} />
                                    <Route path={ROUTES.WATCH_LATER} element={<WatchLaterPage />} />
                                    <Route path={ROUTES.LIKED} element={<LikedPage />} />
                                    <Route path={ROUTES.PROFILE} element={<ProfilePage />} />
                                    <Route path={ROUTES.USER} element={<ProfilePage />} />
                                    <Route path={ROUTES.VIDEO} element={<VideoPage />} />
                                </Route>
                                <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
                            </Routes>
                        </TooltipProvider>
                    </VideoProvider>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
