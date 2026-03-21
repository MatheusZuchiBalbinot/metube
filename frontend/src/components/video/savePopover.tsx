import { useState, useMemo } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { useTranslation } from 'react-i18next';
import { Check, Plus, Bookmark, BookmarkCheck } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@store';
import { videoActions, selectSavedSet } from '@store/videoSlice';
import { toastActions } from '@store/toastSlice';
import { usePlaylist } from '@context/usePlaylist';
import Button from '@ui/button/button';
import Input from '@ui/input/input';
import './savePopover.css';

interface SavePopoverProps {
    videoId: string
    children: React.ReactNode
}

export default function SavePopover({ videoId, children }: SavePopoverProps) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const savedSet = useAppSelector(selectSavedSet);
    const isSaved = savedSet.has(videoId);

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
    const [pendingPlaylists, setPendingPlaylists] = useState<{ id: string; name: string }[]>([]);

    const visiblePlaylists = useMemo(() => {
        const existingIds = new Set(playlists.map(p => p.id));
        const extras = pendingPlaylists.filter(p => !existingIds.has(p.id));
        return [...playlists, ...extras];
    }, [playlists, pendingPlaylists]);

    const videoPlaylistIds = getVideoPlaylistIds(videoId);

    function handleWatchLaterToggle(e: React.MouseEvent) {
        e.stopPropagation();
        dispatch(videoActions.saveVideo(videoId));
        const isNowSaved = !isSaved;
        dispatch(toastActions.addToast({
            message: t(isNowSaved ? 'toast.saved' : 'toast.unsaved'),
            type: 'success',
        }));
    }

    function handlePlaylistToggle(e: React.MouseEvent, playlistId: string, playlistName: string) {
        e.stopPropagation();
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

    function handleShowNewPlaylist(e: React.MouseEvent) {
        e.stopPropagation();
        setNewPlaylistOpen(true);
    }

    function handleCreatePlaylist(e: React.MouseEvent) {
        e.stopPropagation();
        const trimmedName = newPlaylistName.trim();
        const isNameEmpty = trimmedName === '';
        if (isNameEmpty) { return; }

        const newId = crypto.randomUUID();
        createPlaylist(newId, trimmedName);
        addVideoToPlaylist(newId, videoId);
        setPendingPlaylists(prev => [...prev, { id: newId, name: trimmedName }]);
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
            handleCreatePlaylist(e as unknown as React.MouseEvent);
        }
        if (isEscape) {
            setNewPlaylistOpen(false);
            setNewPlaylistName('');
        }
    }

    function handleOpenChange(isOpen: boolean) {
        setOpen(isOpen);
        const isClosed = !isOpen;
        if (isClosed) {
            setNewPlaylistOpen(false);
            setNewPlaylistName('');
            setPendingPlaylists([]);
        }
    }

    return (
        <Popover.Root open={open} onOpenChange={handleOpenChange}>
            <Popover.Trigger asChild onClick={e => e.stopPropagation()}>
                {children}
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    className="save-popover__content"
                    side="top"
                    align="start"
                    sideOffset={6}
                    onClick={e => e.stopPropagation()}
                >
                    <p className="save-popover__title">{t('playlist.save_to')}</p>

                    <button
                        type="button"
                        className="save-popover__row"
                        onClick={handleWatchLaterToggle}
                    >
                        <span className="save-popover__row-check">
                            {isSaved ? <Check size={13} /> : null}
                        </span>
                        {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                        <span className="save-popover__row-label">{t('playlist.watch_later_row')}</span>
                    </button>

                    {visiblePlaylists.length > 0 && (
                        <div className="save-popover__divider" aria-hidden="true" />
                    )}

                    {visiblePlaylists.map(playlist => {
                        const isInPlaylist = videoPlaylistIds.includes(playlist.id);
                        return (
                            <button
                                key={playlist.id}
                                type="button"
                                className="save-popover__row"
                                onClick={e => handlePlaylistToggle(e, playlist.id, playlist.name)}
                            >
                                <span className="save-popover__row-check">
                                    {isInPlaylist ? <Check size={13} /> : null}
                                </span>
                                <span className="save-popover__row-label">{playlist.name}</span>
                            </button>
                        );
                    })}

                    <div className="save-popover__divider" aria-hidden="true" />

                    {newPlaylistOpen ? (
                        <div className="save-popover__new-form" onClick={e => e.stopPropagation()}>
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
                            >
                                {t('playlist.create')}
                            </Button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="save-popover__row save-popover__row--new"
                            onClick={handleShowNewPlaylist}
                        >
                            <span className="save-popover__row-check" aria-hidden="true" />
                            <Plus size={14} />
                            <span className="save-popover__row-label">{t('playlist.new_playlist_inline')}</span>
                        </button>
                    )}
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
