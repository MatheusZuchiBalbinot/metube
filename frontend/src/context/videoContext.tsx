import { createContext, useMemo, useState, type ReactNode } from 'react';
import { MOCK_VIDEOS, VideoStatus, type Video } from '@data/mockVideos';
import { STORAGE_KEYS } from '@utils/storageKeys';

interface TagView {
    tag: string
    fromVideoId: string | null
}

interface VideoContextValue {
    videos: Video[]
    watchHistory: string[]
    historyTags: string[]
    likedVideos: Set<string>
    dislikedVideos: Set<string>
    savedVideos: Set<string>
    uploadModalOpen: boolean
    activeTagView: TagView | null

    addVideo(video: Omit<Video, 'id' | 'views'>): void
    editVideo(id: string, partial: Partial<Video>): void
    deleteVideo(id: string): void
    likeVideo(id: string): void
    dislikeVideo(id: string): void
    saveVideo(id: string): void
    watchVideo(videoId: string): void
    openUploadModal(): void
    closeUploadModal(): void
    openTagView(tag: string, fromVideoId: string | null): void
    closeTagView(): void
    getRecommendations(limit?: number): Video[]
    getPublishedVideos(): Video[]
}

export const VideoContext = createContext<VideoContextValue | null>(null);

export function VideoProvider({ children }: { children: ReactNode }) {
    const [videos, setVideos] = useState<Video[]>(MOCK_VIDEOS);

    const [watchHistory, setWatchHistory] = useState<string[]>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.WATCH_HISTORY);
        const hasStored = stored !== null;
        return hasStored ? (JSON.parse(stored) as string[]) : [];
    });

    const [likedVideos, setLikedVideos] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.LIKED_VIDEOS);
        const hasStored = stored !== null;
        return hasStored ? new Set(JSON.parse(stored) as string[]) : new Set();
    });

    const [dislikedVideos, setDislikedVideos] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.DISLIKED_VIDEOS);
        const hasStored = stored !== null;
        return hasStored ? new Set(JSON.parse(stored) as string[]) : new Set();
    });

    const [savedVideos, setSavedVideos] = useState<Set<string>>(() => {
        const stored = localStorage.getItem(STORAGE_KEYS.SAVED_VIDEOS);
        const hasStored = stored !== null;
        return hasStored ? new Set(JSON.parse(stored) as string[]) : new Set();
    });

    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [activeTagView, setActiveTagView] = useState<TagView | null>(null);

    const historyTags = useMemo<string[]>(() => {
        const watchedIds = new Set(watchHistory);
        const tagSet = new Set<string>();
        for (const video of videos) {
            const isWatched = watchedIds.has(video.id);
            if (!isWatched) { continue; }
            for (const tag of video.tags) {
                tagSet.add(tag);
            }
        }
        return Array.from(tagSet);
    }, [watchHistory, videos]);

    function addVideo(video: Omit<Video, 'id' | 'views'>) {
        const newVideo: Video = {
            ...video,
            id: crypto.randomUUID(),
            views: 0,
        };
        setVideos(prev => [newVideo, ...prev]);
    }

    function editVideo(id: string, partial: Partial<Video>) {
        setVideos(prev => prev.map(v => v.id === id ? { ...v, ...partial } : v));
    }

    function deleteVideo(id: string) {
        setVideos(prev => prev.filter(v => v.id !== id));

        setWatchHistory(prev => {
            const next = prev.filter(vid => vid !== id);
            localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(next));
            return next;
        });

        setLikedVideos(prev => {
            const next = new Set(prev);
            next.delete(id);
            localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify([...next]));
            return next;
        });

        setDislikedVideos(prev => {
            const next = new Set(prev);
            next.delete(id);
            localStorage.setItem(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify([...next]));
            return next;
        });

        setSavedVideos(prev => {
            const next = new Set(prev);
            next.delete(id);
            localStorage.setItem(STORAGE_KEYS.SAVED_VIDEOS, JSON.stringify([...next]));
            return next;
        });
    }

    function likeVideo(id: string) {
        setLikedVideos(prev => {
            const next = new Set(prev);
            const isLiked = next.has(id);
            if (isLiked) {
                next.delete(id);
            } else {
                next.add(id);
            }
            localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify([...next]));
            return next;
        });
        setDislikedVideos(prev => {
            const isDisliked = prev.has(id);
            if (!isDisliked) { return prev; }
            const next = new Set(prev);
            next.delete(id);
            localStorage.setItem(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify([...next]));
            return next;
        });
    }

    function dislikeVideo(id: string) {
        setDislikedVideos(prev => {
            const next = new Set(prev);
            const isDisliked = next.has(id);
            if (isDisliked) {
                next.delete(id);
            } else {
                next.add(id);
            }
            localStorage.setItem(STORAGE_KEYS.DISLIKED_VIDEOS, JSON.stringify([...next]));
            return next;
        });
        setLikedVideos(prev => {
            const isLiked = prev.has(id);
            if (!isLiked) { return prev; }
            const next = new Set(prev);
            next.delete(id);
            localStorage.setItem(STORAGE_KEYS.LIKED_VIDEOS, JSON.stringify([...next]));
            return next;
        });
    }

    function saveVideo(id: string) {
        setSavedVideos(prev => {
            const next = new Set(prev);
            const isSaved = next.has(id);
            if (isSaved) {
                next.delete(id);
            } else {
                next.add(id);
            }
            localStorage.setItem(STORAGE_KEYS.SAVED_VIDEOS, JSON.stringify([...next]));
            return next;
        });
    }

    function watchVideo(videoId: string) {
        setWatchHistory(prev => {
            const isAlreadyFirst = prev[0] === videoId;
            if (isAlreadyFirst) { return prev; }
            const filtered = prev.filter(id => id !== videoId);
            const next = [videoId, ...filtered];
            localStorage.setItem(STORAGE_KEYS.WATCH_HISTORY, JSON.stringify(next));
            return next;
        });
    }

    function openUploadModal() {
        setUploadModalOpen(true);
    }

    function closeUploadModal() {
        setUploadModalOpen(false);
    }

    function openTagView(tag: string, fromVideoId: string | null) {
        setActiveTagView({ tag, fromVideoId });
    }

    function closeTagView() {
        setActiveTagView(null);
    }

    function getPublishedVideos(): Video[] {
        const now = new Date();
        return videos.filter(v => {
            const isPublished = v.status === VideoStatus.PUBLISHED;
            const isScheduledAndPast =
                v.status === VideoStatus.SCHEDULED &&
                v.scheduledAt !== undefined &&
                new Date(v.scheduledAt) <= now;
            return isPublished || isScheduledAndPast;
        });
    }

    function getRecommendations(limit = 20): Video[] {
        const published = getPublishedVideos();
        const hasHistory = historyTags.length > 0;

        if (!hasHistory) {
            return [...published].sort((a, b) => b.views - a.views).slice(0, limit);
        }

        const historyTagSet = new Set(historyTags);
        const maxViews = Math.max(...published.map(v => v.views), 1);

        function scoreVideo(video: Video): number {
            const matchingTagCount = video.tags.filter(t => historyTagSet.has(t)).length;
            const hasAnyTag = video.tags.length > 0;
            const tagScore = hasAnyTag ? matchingTagCount / video.tags.length : 0;
            const viewsBoost = Math.log1p(video.views) / Math.log1p(maxViews);
            return tagScore * 0.85 + viewsBoost * 0.15;
        }

        return [...published]
            .map(v => ({ video: v, score: scoreVideo(v) }))
            .sort((a, b) => b.score - a.score)
            .map(({ video }) => video)
            .slice(0, limit);
    }

    const value: VideoContextValue = {
        videos,
        watchHistory,
        historyTags,
        likedVideos,
        dislikedVideos,
        savedVideos,
        uploadModalOpen,
        activeTagView,
        addVideo,
        editVideo,
        deleteVideo,
        likeVideo,
        dislikeVideo,
        saveVideo,
        watchVideo,
        openUploadModal,
        closeUploadModal,
        openTagView,
        closeTagView,
        getRecommendations,
        getPublishedVideos,
    };

    return (
        <VideoContext.Provider value={value}>
            {children}
        </VideoContext.Provider>
    );
}
