import { useState } from 'react';
import type { Video, VideoId } from '@models';

interface UseDeleteVideoModalResult {
    videoToDelete: Video | null
    handleDeleteClick: (video: Video) => void
    handleDeleteById: (id: VideoId, videos: Video[]) => void
    handleDeleteConfirm: (onDelete: (id: VideoId) => void) => void
    handleDeleteCancel: () => void
}

export function useDeleteVideoModal(): UseDeleteVideoModalResult {
    const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);

    function handleDeleteClick(video: Video) {
        setVideoToDelete(video);
    }

    function handleDeleteById(id: VideoId, videos: Video[]) {
        const video = videos.find(v => v.id === id);
        if (video !== undefined) {
            handleDeleteClick(video);
        }
    }

    function handleDeleteConfirm(onDelete: (id: VideoId) => void) {
        if (videoToDelete === null) {
            return;
        }
        onDelete(videoToDelete.id);
        setVideoToDelete(null);
    }

    function handleDeleteCancel() {
        setVideoToDelete(null);
    }

    return { videoToDelete, handleDeleteClick, handleDeleteById, handleDeleteConfirm, handleDeleteCancel };
}
