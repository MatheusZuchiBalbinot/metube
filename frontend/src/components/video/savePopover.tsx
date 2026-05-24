import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import type { Playlist, PlaylistId } from '@models/playlist';
import type { VideoId } from '@models/video';
import { domain } from '@domain';
import Button from '@ui/button/button';
import Checkbox from '@ui/checkbox/checkbox';
import Input from '@ui/input/input';
import Modal from '@ui/modal/modal';
import './savePopover.css';
import { ToastType } from '@enums/toastType';
import { usePlaylist } from '@hooks';

interface SavePopoverProps {
    videoId: VideoId
    children: React.ReactNode
}

export default function SavePopover({ videoId, children }: SavePopoverProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const {
        playlists,
        createPlaylist,
        addVideoToPlaylist,
        removeVideoFromPlaylist,
        getVideoPlaylistIds,
    } = usePlaylist();

    const [open, setOpen] = useState(false);
    const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
    const [newPlaylist, setNewPlaylist] = useState('');
    const [creating, setCreating] = useState(false);

    const watchLaterPlaylist = playlists.find((pl: Playlist) => domain.playlist.isWatchLater(pl));
    const videoPlaylistIds = getVideoPlaylistIds(videoId);
    const isInWatchLater = watchLaterPlaylist !== undefined && videoPlaylistIds.includes(watchLaterPlaylist.id);
    const visiblePlaylists = playlists.filter((pl: Playlist) => !domain.playlist.isWatchLater(pl));

    function handleTriggerClick(e: React.MouseEvent) {
        e.stopPropagation();
        setOpen(true);
    }

    function handleClose() {
        setOpen(false);
        setNewPlaylistOpen(false);
        setNewPlaylist('');
    }

    function handleWatchLaterChange() {
        if (!watchLaterPlaylist) {
            return;
        }

        if (isInWatchLater) {
            removeVideoFromPlaylist(watchLaterPlaylist.id, videoId);
            dispatch(toastActions.addToast({ message: t('toast.unsaved'), type: ToastType.INFO }));
        } else {
            addVideoToPlaylist(watchLaterPlaylist.id, videoId);
            dispatch(toastActions.addToast({ message: t('toast.saved'), type: ToastType.SUCCESS }));
        }
    }

    function handlePlaylistChange(playlistId: PlaylistId, playlistName: string) {
        const isInPlaylist = videoPlaylistIds.includes(playlistId);
        if (isInPlaylist) {
            removeVideoFromPlaylist(playlistId, videoId);
            dispatch(toastActions.addToast({
                message: t('toast.removed_from_playlist'),
                type: ToastType.INFO,
            }));
        } else {
            addVideoToPlaylist(playlistId, videoId);
            dispatch(toastActions.addToast({
                message: t('toast.added_to_playlist', { name: playlistName }),
                type: ToastType.SUCCESS,
            }));
        }
    }

    async function handleCreatePlaylist() {
        const trimmedName = newPlaylist.trim();
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

        addVideoToPlaylist(newId, videoId);
        dispatch(toastActions.addToast({
            message: t('toast.playlist_created'),
            type: ToastType.SUCCESS,
        }));
        setNewPlaylist('');
        setNewPlaylistOpen(false);
    }

    function handleOpenNewPlaylist() {
        setNewPlaylistOpen(true);
    }

    function handleNewPlaylistChange(e: React.ChangeEvent<HTMLInputElement>) {
        setNewPlaylist(e.target.value);
    }

    function handleInputKeyDown(e: React.KeyboardEvent) {
        const isEnter = e.key === 'Enter';
        const isEscape = e.key === 'Escape';
        if (isEnter) {
            handleCreatePlaylist();
        }

        if (isEscape) {
            setNewPlaylistOpen(false);
            setNewPlaylist('');
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
                        <Checkbox checked={isInWatchLater} onChange={handleWatchLaterChange} />
                        <span className="save-modal__label">{t('playlist.watch_later_row')}</span>
                    </label>

                    {visiblePlaylists.length > 0 && (
                        <div className="save-modal__divider" aria-hidden="true" />
                    )}

                    {visiblePlaylists.map((pl: Playlist) => {
                        const isInPlaylist = videoPlaylistIds.includes(pl.id);
                        return (
                            <label key={pl.id} className="save-modal__row">
                                <Checkbox
                                    checked={isInPlaylist}
                                    onChange={() => handlePlaylistChange(pl.id, pl.name)}
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
                                value={newPlaylist}
                                onChange={handleNewPlaylistChange}
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
                        <Button
                            variant="ghost"
                            size="sm"
                            fullWidth
                            className="save-modal__new-btn"
                            leftIcon={<Plus size={14} />}
                            onClick={handleOpenNewPlaylist}
                        >
                            {t('playlist.new_playlist_inline')}
                        </Button>
                    )}
                </div>
            </Modal>
        </>
    );
}
