import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reorder } from 'framer-motion';
import { ChevronDown, ChevronRight, GripVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import type { Video } from '@data/mockVideos';
import type { Playlist } from '@data/mockPlaylists';
import { ROUTES } from '@utils/routes';
import { Format } from '@utils/format';
import { usePlaylist } from '@context/usePlaylist';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import Modal from '@ui/modal/modal';
import Input from '@ui/input/input';
import './card.css';

interface PlaylistCardProps {
    playlist: Playlist
    videos: Video[]
}

interface PlaylistVideoRowProps {
    video: Video
    playlistId: string
}

function PlaylistVideoRow({ video, playlistId }: PlaylistVideoRowProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { removeVideoFromPlaylist } = usePlaylist();
    const dispatch = useAppDispatch();

    function handleRowClick() {
        navigate(ROUTES.VIDEO.replace(':id', video.id));
    }

    function handleRemove(e: React.MouseEvent) {
        e.stopPropagation();
        removeVideoFromPlaylist(playlistId, video.id);
        dispatch(toastActions.addToast({ message: t('toast.removed_from_playlist'), type: 'info' }));
    }

    return (
        <div className="playlist-video-row" onClick={handleRowClick}>
            <span className="playlist-video-row__drag-handle" aria-hidden="true">
                <GripVertical size={14} />
            </span>
            <img
                className="playlist-video-row__thumb"
                src={video.thumbnail}
                alt={video.title}
                loading="lazy"
            />
            <div className="playlist-video-row__body">
                <p className="playlist-video-row__title">{video.title}</p>
                <span className="playlist-video-row__channel">{video.channel}</span>
                {video.duration != null && video.duration > 0 && (
                    <span className="playlist-video-row__duration">{Format.duration(video.duration)}</span>
                )}
            </div>
            <Tooltip content={t('playlist.remove_video')} side="left">
                <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('playlist.remove_video')}
                    className="playlist-video-row__remove"
                    onClick={handleRemove}
                >
                    <X size={13} />
                </Button>
            </Tooltip>
        </div>
    );
}

export default function PlaylistCard({ playlist, videos }: PlaylistCardProps) {
    const { t } = useTranslation();
    const { renamePlaylist, deletePlaylist, reorderVideosInPlaylist } = usePlaylist();
    const dispatch = useAppDispatch();

    const [expanded, setExpanded] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [renameName, setRenameName] = useState(playlist.name);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const videoCount = playlist.videoIds.length;
    const countKey = videoCount === 1 ? 'playlist.videos_count_one' : 'playlist.videos_count_other';

    function handleToggleExpand() {
        setExpanded(prev => !prev);
    }

    function handleRenameStart(e: React.MouseEvent) {
        e.stopPropagation();
        setRenameName(playlist.name);
        setRenaming(true);
    }

    function handleRenameConfirm(e: React.MouseEvent) {
        e.stopPropagation();
        const trimmed = renameName.trim();
        const isEmpty = trimmed === '';
        if (isEmpty) { return; }
        renamePlaylist(playlist.id, trimmed);
        setRenaming(false);
    }

    function handleRenameCancel(e: React.MouseEvent) {
        e.stopPropagation();
        setRenameName(playlist.name);
        setRenaming(false);
    }

    function handleRenameKeyDown(e: React.KeyboardEvent) {
        const isEnter = e.key === 'Enter';
        const isEscape = e.key === 'Escape';
        if (isEnter) { handleRenameConfirm(e as unknown as React.MouseEvent); }
        if (isEscape) { handleRenameCancel(e as unknown as React.MouseEvent); }
    }

    function handleDeleteConfirm() {
        deletePlaylist(playlist.id);
        dispatch(toastActions.addToast({ message: t('toast.playlist_deleted'), type: 'info' }));
        setDeleteConfirmOpen(false);
    }

    function handleDeleteRequest(e: React.MouseEvent) {
        e.stopPropagation();
        setDeleteConfirmOpen(true);
    }

    function handleReorder(newVideoIds: string[]) {
        reorderVideosInPlaylist(playlist.id, newVideoIds);
    }

    return (
        <div className="playlist-card">
            <div className="playlist-card__header" onClick={handleToggleExpand}>
                <button
                    type="button"
                    className="playlist-card__chevron"
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    tabIndex={-1}
                    aria-hidden="true"
                >
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>

                {renaming ? (
                    <div className="playlist-card__rename-form" onClick={e => e.stopPropagation()}>
                        <Input
                            autoFocus
                            value={renameName}
                            onChange={e => setRenameName(e.target.value)}
                            onKeyDown={handleRenameKeyDown}
                        />
                        <Tooltip content={t('common.save')} side="top">
                            <Button size="icon" variant="ghost" aria-label={t('common.save')} onClick={handleRenameConfirm}>
                                <Check size={13} />
                            </Button>
                        </Tooltip>
                        <Tooltip content={t('common.cancel')} side="top">
                            <Button size="icon" variant="ghost" aria-label={t('common.cancel')} onClick={handleRenameCancel}>
                                <X size={13} />
                            </Button>
                        </Tooltip>
                    </div>
                ) : (
                    <>
                        <div className="playlist-card__info">
                            <span className="playlist-card__name">{playlist.name}</span>
                            <span className="playlist-card__count">{t(countKey, { count: videoCount })}</span>
                        </div>
                        <div className="playlist-card__actions">
                            <Tooltip content={t('playlist.rename')} side="top">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={t('playlist.rename')}
                                    onClick={handleRenameStart}
                                >
                                    <Pencil size={13} />
                                </Button>
                            </Tooltip>
                            <Tooltip content={t('playlist.delete')} side="top">
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={t('playlist.delete')}
                                    onClick={handleDeleteRequest}
                                >
                                    <Trash2 size={13} />
                                </Button>
                            </Tooltip>
                        </div>
                    </>
                )}
            </div>

            {expanded && (
                <div className="playlist-card__videos">
                    {videos.length === 0 ? (
                        <p className="playlist-card__empty">{t('playlist.empty_playlist')}</p>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={playlist.videoIds}
                            onReorder={handleReorder}
                            className="playlist-card__reorder-group"
                        >
                            {videos.map(video => (
                                <Reorder.Item
                                    key={video.id}
                                    value={video.id}
                                    className="playlist-card__reorder-item"
                                >
                                    <PlaylistVideoRow video={video} playlistId={playlist.id} />
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    )}
                </div>
            )}

            <Modal
                isOpen={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                title={t('playlist.delete')}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteConfirmOpen(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="danger" onClick={handleDeleteConfirm}>
                            {t('playlist.delete')}
                        </Button>
                    </>
                }
            >
                <p>{t('playlist.delete_confirm', { name: playlist.name })}</p>
            </Modal>
        </div>
    );
}
