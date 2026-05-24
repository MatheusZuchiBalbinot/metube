import React, { Suspense, useEffect } from 'react';
import './app.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@store';
import { fetchMe, authActions } from '@store/authSlice';
import { toastActions } from '@store/toastSlice';
import { APP_EVENTS } from '@utils/events';
import { initCrossTabSync } from '@store/crossTabSync';
import Guard from '@components/guard/guard';
import { SearchProvider } from '@context/searchContext';
import AppLayout from '@components/layout/layout';
import Spinner from '@components/ui/spinner/spinner';
import ErrorBoundary from '@components/error/boundary';
import { useTranslation } from 'react-i18next';
import { ToastType } from '@enums/toastType';

const LoginPage = React.lazy(() => import('@pages/login/login'));
const SignupPage = React.lazy(() => import('@pages/signup/signup'));
const ForgotPasswordPage = React.lazy(() => import('@pages/forgotPassword/forgotPassword'));
const ResetPasswordPage = React.lazy(() => import('@pages/resetPassword/resetPassword'));
const UploadModal = React.lazy(() => import('@components/upload/modal'));
import { ROUTES } from '@utils/routes';
import { TooltipProvider } from '@ui';
import { BoundaryLevel } from '@enums/boundaryLevel';
import { useBootstrap, useRealtime } from '@hooks';

const HomePage = React.lazy(() => import('@pages/home/home'));
const HistoryPage = React.lazy(() => import('@pages/history/history'));
const PlaylistsPage = React.lazy(() => import('@pages/playlists/playlists'));
const LikedPage = React.lazy(() => import('@pages/liked/liked'));
const ProfilePage = React.lazy(() => import('@pages/profile/profile'));
const VideoPage = React.lazy(() => import('@pages/video/video'));
const SearchPage = React.lazy(() => import('@pages/search/search'));
const ChannelPage = React.lazy(() => import('@pages/channel/channel'));
const ShortsPage = React.lazy(() => import('@pages/shorts/shorts'));
const NotFoundPage = React.lazy(() => import('@pages/notFound/notFound'));

const PROTECTED_ROUTES: { path: string; Page: React.LazyExoticComponent<() => React.ReactElement> }[] = [
    { path: ROUTES.HOME, Page: HomePage },
    { path: ROUTES.SHORTS, Page: ShortsPage },
    { path: ROUTES.HISTORY, Page: HistoryPage },
    { path: ROUTES.PLAYLISTS, Page: PlaylistsPage },
    { path: ROUTES.LIKED, Page: LikedPage },
    { path: ROUTES.PROFILE, Page: ProfilePage },
    { path: ROUTES.USER, Page: ProfilePage },
    { path: ROUTES.VIDEO, Page: VideoPage },
    { path: ROUTES.SEARCH, Page: SearchPage },
    { path: ROUTES.CHANNEL, Page: ChannelPage },
];

function PageSpinner() {
    return <Spinner fullPage />;
}

function AppInit({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const { t } = useTranslation();
    useBootstrap();
    useRealtime();

    useEffect(() => {
        dispatch(fetchMe());

        function isEventWithMessage(e: Event): e is CustomEvent<{ message: string }> {
            return e instanceof CustomEvent && typeof (e.detail as { message?: unknown })?.message === 'string';
        }

        function onSessionExpired(e: Event) {
            const isValid = isEventWithMessage(e);
            if (!isValid) {
                return;
            }
            dispatch(authActions.sessionExpired(e.detail.message));
        }

        function onForbidden(e: Event) {
            const isValid = isEventWithMessage(e);
            if (!isValid) {
                return;
            }
            dispatch(toastActions.addToast({ message: e.detail.message, type: ToastType.ERROR }));
        }

        function onServiceUnavailable(e: Event) {
            const isValid = isEventWithMessage(e);
            if (!isValid) {
                return;
            }
            dispatch(toastActions.addToast({ message: e.detail.message, type: ToastType.ERROR }));
        }

        window.addEventListener(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
        window.addEventListener(APP_EVENTS.FORBIDDEN, onForbidden);
        window.addEventListener(APP_EVENTS.SERVICE_UNAVAILABLE, onServiceUnavailable);
        const stopCrossTabSync = initCrossTabSync(dispatch);

        return () => {
            window.removeEventListener(APP_EVENTS.SESSION_EXPIRED, onSessionExpired);
            window.removeEventListener(APP_EVENTS.FORBIDDEN, onForbidden);
            window.removeEventListener(APP_EVENTS.SERVICE_UNAVAILABLE, onServiceUnavailable);
            stopCrossTabSync();
        };
    }, [dispatch, t]);

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
                            <ErrorBoundary level={BoundaryLevel.PAGE}>
                                <Routes>
                                    <Route path={ROUTES.LOGIN} element={<Suspense fallback={<PageSpinner />}><LoginPage /></Suspense>} />
                                    <Route path={ROUTES.SIGNUP} element={<Suspense fallback={<PageSpinner />}><SignupPage /></Suspense>} />
                                    <Route path={ROUTES.FORGOT_PASSWORD} element={<Suspense fallback={<PageSpinner />}><ForgotPasswordPage /></Suspense>} />
                                    <Route path={ROUTES.RESET_PASSWORD} element={<Suspense fallback={<PageSpinner />}><ResetPasswordPage /></Suspense>} />
                                    <Route element={<Guard><AppLayout /></Guard>}>
                                        {PROTECTED_ROUTES.map(({ path, Page }) => (
                                            <Route key={path} path={path} element={<ErrorBoundary level={BoundaryLevel.SECTION} key={path}><Page /></ErrorBoundary>} />
                                        ))}
                                    </Route>
                                    <Route path="*" element={<Suspense fallback={null}><NotFoundPage /></Suspense>} />
                                </Routes>
                            </ErrorBoundary>
                        </TooltipProvider>
                    </SearchProvider>
                </AppInit>
            </BrowserRouter>
        </Provider>
    );
}

