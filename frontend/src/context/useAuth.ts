import { useAppDispatch, useAppSelector } from '@store';
import { signInThunk, signOutThunk } from '@store/authSlice';
import type { User } from '../api/auth';

export type { User };

export function useAuth() {
    const dispatch = useAppDispatch();
    const { user, loading, sessionError } = useAppSelector(s => s.auth);

    async function signIn(email: string, password: string): Promise<void> {
        await dispatch(signInThunk({ email, password })).unwrap();
    }

    async function signOut(): Promise<void> {
        await dispatch(signOutThunk()).unwrap();
    }

    return { user, loading, sessionError, signIn, signOut };
}
