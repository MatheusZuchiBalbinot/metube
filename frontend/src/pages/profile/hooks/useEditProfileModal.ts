import { useState } from 'react';

interface UseEditProfileModalResult {
    editProfileOpen: boolean
    editName: string
    editBio: string
    setEditName: React.Dispatch<React.SetStateAction<string>>
    setEditBio: React.Dispatch<React.SetStateAction<string>>
    handleEditProfileOpen: (currentName: string, currentBio: string) => void
    handleEditProfileClose: () => void
    handleEditProfileSubmit: (
        e: React.FormEvent,
        onSave: (name: string, bio: string) => void,
    ) => void
}

export function useEditProfileModal(): UseEditProfileModalResult {
    const [editProfileOpen, setEditProfileOpen] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');

    function handleEditProfileOpen(currentName: string, currentBio: string) {
        setEditName(currentName);
        setEditBio(currentBio);
        setEditProfileOpen(true);
    }

    function handleEditProfileClose() {
        setEditProfileOpen(false);
    }

    function handleEditProfileSubmit(
        e: React.FormEvent,
        onSave: (name: string, bio: string) => void,
    ) {
        e.preventDefault();
        const isNameEmpty = editName.trim() === '';
        if (isNameEmpty) {
            return;
        }
        onSave(editName.trim(), editBio.trim());
        handleEditProfileClose();
    }

    return {
        editProfileOpen, editName, editBio, setEditName, setEditBio,
        handleEditProfileOpen, handleEditProfileClose, handleEditProfileSubmit,
    };
}
