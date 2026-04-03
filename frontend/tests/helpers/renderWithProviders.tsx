/**
 * Test wrapper that provides all necessary providers (Redux, Router, i18n, Context).
 * Use this in component tests instead of directly rendering components.
 */

import React, { type ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore, type PreloadedState } from '@reduxjs/toolkit';
import videoSlice from '@store/videoSlice';
import authSlice from '@store/authSlice';
import themeSlice from '@store/themeSlice';
import toastSlice from '@store/toastSlice';
import subscriptionSlice from '@store/subscriptionSlice';
import playlistSlice from '@store/playlistSlice';
import searchSlice from '@store/searchSlice';
import { SearchProvider } from '@context/searchContext';
import type { RootState } from '@store';
import { makeRootState } from './factories';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    preloadedState?: PreloadedState<RootState>;
    route?: string;
}

export function renderWithProviders(
    ui: ReactElement,
    {
        preloadedState = makeRootState(),
        route = '/',
        ...renderOptions
    }: ExtendedRenderOptions = {},
) {
    const store = configureStore({
        reducer: {
            video: videoSlice.reducer,
            auth: authSlice.reducer,
            theme: themeSlice.reducer,
            toast: toastSlice.reducer,
            subscription: subscriptionSlice.reducer,
            playlist: playlistSlice.reducer,
            search: searchSlice.reducer,
        },
        preloadedState,
    });

    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <Provider store={store}>
                <MemoryRouter initialEntries={[route]}>
                    <SearchProvider>{children}</SearchProvider>
                </MemoryRouter>
            </Provider>
        );
    }

    return {
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
        store,
    };
}
