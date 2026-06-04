import type { RootState } from './types';

export const selectAuthUser = (state: RootState) => state.auth.user;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthSessionError = (state: RootState) => state.auth.sessionError;
export const selectAuth = (state: RootState) => state.auth;
