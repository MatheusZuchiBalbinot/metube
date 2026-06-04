import { useAppDispatch, useAppSelector } from '@store';
import { signInThunk, signOutThunk, signUpThunk, authActions } from '@store/authSlice';
import { selectAuth } from '@store/authSelectors';
import type { User } from '@api';

export type { User };

export function useAuth() {
    const dispatch = useAppDispatch();
    const { user, loading, sessionError } = useAppSelector(selectAuth);

    async function signIn(email: string, password: string): Promise<void> {
        await dispatch(signInThunk({ email, password })).unwrap();
    }

    async function signUp(name: string, email: string, password: string, passwordConfirmation: string): Promise<void> {
        await dispatch(signUpThunk({ name, email, password, password_confirmation: passwordConfirmation })).unwrap();
    }

    async function signOut(): Promise<void> {
        await dispatch(signOutThunk()).unwrap();
    }

    function updateProfile(name?: string, bio?: string): void {
        dispatch(authActions.updateProfile({ name, bio }));
    }

    return { user, loading, sessionError, signIn, signUp, signOut, updateProfile };
}
