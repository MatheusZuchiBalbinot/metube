export type RemoteData<T> =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'ok'; data: T }
    | { kind: 'error'; message: string }

export const RemoteData = {
    idle: <T = never>(): RemoteData<T> => ({ kind: 'idle' }),
    loading: <T = never>(): RemoteData<T> => ({ kind: 'loading' }),
    ok: <T>(data: T): RemoteData<T> => ({ kind: 'ok', data }),
    error: <T = never>(message: string): RemoteData<T> => ({ kind: 'error', message }),
};
