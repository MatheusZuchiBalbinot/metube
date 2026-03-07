import { useContext } from 'react';
import { VideoContext } from './videoContext';

export function useVideo() {
    const ctx = useContext(VideoContext);
    if (ctx === null) {
        throw new Error('useVideo must be used inside <VideoProvider>');
    }
    return ctx;
}
