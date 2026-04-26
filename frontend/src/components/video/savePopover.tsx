import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store';
import { selectSavedSet } from '@store/videoSlice';
import { toastActions } from '@store/toastSlice';
import { usePlaylist } from '@hooks/usePlaylist';
import { useVideo } from '@hooks/useVideo';
import type { Playlist } from '@models/playlist';
import type { VideoId } from '@models/video';
import Button from '@ui/button/button';
import Input from '@ui/input/input';
import Modal from '@ui/modal/modal';
import './savePopover.css';

interface SavePopoverProps {
    videoId: string
    children: React.ReactNode
}

export default function SavePopover({ videoId, children }: SavePopoverProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const savedSet = useAppSelector(selectSavedSet);
    const isSaved = savedSet.has(videoId as unknown as VideoId);

    const { saveVideo } = useVideo();
    const {
        playlists,
        createPlaylist,
        addVideoToPlaylist,
        removeVideoFromPlaylist,
        getVideoPlaylistIds,
    } = usePlaylist();

    const [open, setOpen] = useState(false);
    const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [creating, setCreating] = useState(false);

    const videoPlaylistIds = getVideoPlaylistIds(videoId);
    const visiblePlaylists = playlists.filter((pl: Playlist) => pl.name !== 'Watch Later');

    function handleTriggerClick(e: React.MouseEvent) {
        e.stopPropagation();
        setOpen(true);
    }

    function handleClose() {
        setOpen(false);
        setNewPlaylistOpen(false);
        setNewPlaylistName('');
    }

    function handleWatchLaterChange() {
        saveVideo(videoId as unknown as VideoId);
        dispatch(toastActions.addToast({
            message: t(isSaved ? 'toast.unsaved' : 'toast.saved'),
            type: 'success',
        }));
    }

    function handlePlaylistChange(playlistId: string, playlistName: string) {
        const isInPlaylist = videoPlaylistIds.includes(playlistId);
        if (isInPlaylist) {
            removeVideoFromPlaylist(playlistId, videoId);
            dispatch(toastActions.addToast({
                message: t('toast.removed_from_playlist'),
                type: 'info',
            }));
        } else {
            addVideoToPlaylist(playlistId, videoId);
            dispatch(toastActions.addToast({
                message: t('toast.added_to_playlist', { name: playlistName }),
                type: 'success',
            }));
        }
    }

    async function handleCreatePlaylist() {
        const trimmedName = newPlaylistName.trim();
        const isNameEmpty = trimmedName === '';
        if (isNameEmpty || creating) {
            return;
        }

        setCreating(true);
        const newId = await createPlaylist(trimmedName);
        setCreating(false);

        if (!newId) {
            return;
        }

        addVideoToPlaylist(newId as string, videoId);
        dispatch(toastActions.addToast({
            message: t('toast.playlist_created'),
            type: 'success',
        }));
        setNewPlaylistName('');
        setNewPlaylistOpen(false);
    }

    function handleInputKeyDown(e: React.KeyboardEvent) {
        const isEnter = e.key === 'Enter';
        const isEscape = e.key === 'Escape';
        if (isEnter) {
            handleCreatePlaylist();
        }

        if (isEscape) {
            setNewPlaylistOpen(false);
            setNewPlaylistName('');
        }
    }

    return (
        <>
            <div className="save-popover__trigger" onClick={handleTriggerClick}>
                {children}
            </div>

            <Modal
                isOpen={open}
                onClose={handleClose}
                title={t('playlist.save_to')}
                size="sm"
            >
                <div className="save-modal__list">
                    <label className="save-modal__row">
                        <input
                            type="checkbox"
                            className="save-modal__checkbox"
                            checked={isSaved}
                            onChange={handleWatchLaterChange}
                        />
                        <span className="save-modal__label">{t('playlist.watch_later_row')}</span>
                    </label>

                    {visiblePlaylists.length > 0 && (
                        <div className="save-modal__divider" aria-hidden="true" />
                    )}

                    {visiblePlaylists.map((pl: Playlist) => {
                        const isInPlaylist = videoPlaylistIds.includes(pl.id as string);
                        return (
                            <label key={pl.id as string} className="save-modal__row">
                                <input
                                    type="checkbox"
                                    className="save-modal__checkbox"
                                    checked={isInPlaylist}
                                    onChange={() => handlePlaylistChange(pl.id as string, pl.name)}
                                />
                                <span className="save-modal__label">{pl.name}</span>
                            </label>
                        );
                    })}

                    <div className="save-modal__divider" aria-hidden="true" />

                    {newPlaylistOpen ? (
                        <div className="save-modal__new-form">
                            <Input
                                autoFocus
                                value={newPlaylistName}
                                onChange={e => setNewPlaylistName(e.target.value)}
                                onKeyDown={handleInputKeyDown}
                                placeholder={t('playlist.name_placeholder')}
                            />
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleCreatePlaylist}
                                disabled={creating}
                            >
                                {t('playlist.create')}
                            </Button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="save-modal__new-btn"
                            onClick={() => setNewPlaylistOpen(true)}
                        >
                            <Plus size={14} />
                            <span>{t('playlist.new_playlist_inline')}</span>
                        </button>
                    )}
                </div>
            </Modal>
        </>
    );
}
