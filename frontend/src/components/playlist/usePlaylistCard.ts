import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import { ToastType } from '@enums/toastType';
import { usePlaylist } from '@hooks';
import type { Playlist, VideoId } from '@models';

/**
 * Owns the interactive state of a `PlaylistCard` (expand, rename, delete-confirm)
 * and the handlers that mutate the playlist. Keeping it out of the component leaves
 * the component thin: it only derives render values and wires these handlers to JSX.
 */
export function usePlaylistCard(playlist: Playlist, defaultExpanded: boolean) {
    const { t } = useTranslation();
    const { renamePlaylist, deletePlaylist, reorderVideosInPlaylist } = usePlaylist();
    const dispatch = useAppDispatch();

    const [expanded, setExpanded] = useState(defaultExpanded);
    const [renaming, setRenaming] = useState(false);
    const [renameName, setRenameName] = useState(playlist.name);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    function handleToggleExpand() {
        setExpanded(prev => !prev);
    }

    function handleChevronClick(e: React.MouseEvent) {
        e.stopPropagation();
        handleToggleExpand();
    }

    function handleRenameStart(e: React.MouseEvent) {
        e.stopPropagation();
        setRenameName(playlist.name);
        setRenaming(true);
    }

    function handleRenameFormClick(e: React.MouseEvent) {
        e.stopPropagation();
    }

    function handleRenameNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setRenameName(e.target.value);
    }

    function handleRenameConfirm(e: React.SyntheticEvent) {
        e.stopPropagation();
        const trimmed = renameName.trim();
        const isTitleEmpty = trimmed === '';

        if (isTitleEmpty) {
            return;
        }

        renamePlaylist(playlist.id, trimmed);
        setRenaming(false);
    }

    function handleRenameCancel(e: React.SyntheticEvent) {
        e.stopPropagation();
        setRenameName(playlist.name);
        setRenaming(false);
    }

    function handleRenameKeyDown(e: React.KeyboardEvent) {
        const isEnter = e.key === 'Enter';
        const isEscape = e.key === 'Escape';

        if (isEnter) {
            handleRenameConfirm(e);
        }

        if (isEscape) {
            handleRenameCancel(e);
        }
    }

    function handleDeleteRequest(e: React.MouseEvent) {
        e.stopPropagation();
        setDeleteConfirmOpen(true);
    }

    function handleDeleteConfirm() {
        deletePlaylist(playlist.id);
        dispatch(toastActions.addToast({ message: t('toast.playlist_deleted'), type: ToastType.INFO }));
        setDeleteConfirmOpen(false);
    }

    function handleDeleteCancel() {
        setDeleteConfirmOpen(false);
    }

    function handleReorder(newVideoIds: string[]) {
        reorderVideosInPlaylist(playlist.id, newVideoIds as VideoId[]);
    }

    return {
        expanded,
        renaming,
        renameName,
        deleteConfirmOpen,
        handleToggleExpand,
        handleChevronClick,
        handleRenameStart,
        handleRenameFormClick,
        handleRenameNameChange,
        handleRenameConfirm,
        handleRenameCancel,
        handleRenameKeyDown,
        handleDeleteRequest,
        handleDeleteConfirm,
        handleDeleteCancel,
        handleReorder,
    };
}
