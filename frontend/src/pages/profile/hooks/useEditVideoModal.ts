import { useState } from 'react';
import type { Video, VideoId, Tag } from '@models';

interface EditVideoPayload {
    title: string
    description: string
    tags: Tag[]
}

interface UseEditVideoModalResult {
    editingVideo: Video | null
    editTitle: string
    editDescription: string
    editTags: Tag[]
    setEditTitle: React.Dispatch<React.SetStateAction<string>>
    setEditDescription: React.Dispatch<React.SetStateAction<string>>
    setEditTags: React.Dispatch<React.SetStateAction<Tag[]>>
    handleEditOpen: (video: Video) => void
    handleEditClose: () => void
    handleEditSubmit: (
        e: React.FormEvent,
        onSave: (id: VideoId, payload: EditVideoPayload) => void,
    ) => void
}

export function useEditVideoModal(): UseEditVideoModalResult {
    const [editingVideo, setEditingVideo] = useState<Video | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editTags, setEditTags] = useState<Tag[]>([]);

    function handleEditOpen(video: Video) {
        setEditingVideo(video);
        setEditTitle(video.title);
        setEditDescription(video.description);
        setEditTags(video.tags);
    }

    function handleEditClose() {
        setEditingVideo(null);
    }

    function handleEditSubmit(
        e: React.FormEvent,
        onSave: (id: VideoId, payload: EditVideoPayload) => void,
    ) {
        e.preventDefault();
        const isTitleEmpty = editTitle.trim() === '';
        if (isTitleEmpty || editingVideo === null) { return; }
        const payload = {
            title: editTitle.trim(),
            description: editDescription.trim(),
            tags: editTags,
        };
        onSave(editingVideo.id, payload);
        handleEditClose();
    }

    return {
        editingVideo, editTitle, editDescription, editTags,
        setEditTitle, setEditDescription, setEditTags,
        handleEditOpen, handleEditClose, handleEditSubmit,
    };
}
