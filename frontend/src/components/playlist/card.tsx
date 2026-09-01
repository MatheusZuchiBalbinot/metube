import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Reorder } from 'framer-motion';
import { ChevronDown, ChevronRight, GripVertical, ListVideo, Pencil, Trash2, X, Check } from '@components/icons/icons';
import { domain } from '@domain';
import { useAppDispatch } from '@store';
import { toastActions } from '@store/toastSlice';
import Button from '@ui/button/button';
import Tooltip from '@ui/tooltip/tooltip';
import Modal from '@ui/modal/modal';
import Input from '@ui/input/input';
import './card.css';
import { ToastType } from '@enums/toastType';
import { usePlaylist } from '@hooks';
import { usePlaylistCard } from './usePlaylistCard';
import { videoUrl, formatDuration, formatDurationCompact, cn, isActivationKey } from '@utils';
import type { Video, Playlist, PlaylistId, Seconds } from '@models';

interface PlaylistCardProps {
    playlist: Playlist
    videos: Video[]
    defaultExpanded?: boolean
}

interface PlaylistVideoRowProps {
    video: Video
    playlistId: PlaylistId
    position: number
}

function PlaylistVideoRow({ video, playlistId, position }: PlaylistVideoRowProps) {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { removeVideoFromPlaylist } = usePlaylist();
    const dispatch = useAppDispatch();

    function handleRowClick() {
        navigate(videoUrl(video.id));
    }

    function handleRowKeyDown(e: React.KeyboardEvent) {
        if (!isActivationKey(e)) {
            return;
        }

        e.preventDefault();
        handleRowClick();
    }

    function handleRemove(e: React.MouseEvent) {
        e.stopPropagation();
        removeVideoFromPlaylist(playlistId, video.id);
        dispatch(toastActions.addToast({ message: t('toast.removed_from_playlist'), type: ToastType.INFO }));
    }

    return (
        <div
            className="playlist-video-row"
            role="button"
            tabIndex={0}
            aria-label={video.title}
            onClick={handleRowClick}
            onKeyDown={handleRowKeyDown}
        >
            <span className="playlist-video-row__drag-handle" aria-hidden="true">
                <GripVertical size={14} />
            </span>
            <span className="playlist-video-row__position" aria-hidden="true">
                {position}
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
                {video.duration !== undefined && video.duration > 0 && (
                    <span className="playlist-video-row__duration">{formatDuration(video.duration)}</span>
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

// eslint-disable-next-line complexity -- inherent branching of a rich presentational card; interactive logic lives in usePlaylistCard
export default function PlaylistCard({ playlist, videos, defaultExpanded = false }: PlaylistCardProps) {
    const { t } = useTranslation();
    const {
        expanded, renaming, renameName, deleteConfirmOpen,
        handleToggleExpand, handleChevronClick, handleRenameStart, handleRenameFormClick,
        handleRenameNameChange, handleRenameConfirm, handleRenameCancel, handleRenameKeyDown,
        handleDeleteRequest, handleDeleteConfirm, handleDeleteCancel, handleReorder,
    } = usePlaylistCard(playlist, defaultExpanded);

    const videoCount = playlist.videoIds.length;
    const isEmpty = videoCount === 0;
    const hasMultipleVideos = videoCount > 1;
    const countKey = videoCount === 1 ? 'playlist.videos_count_one' : 'playlist.videos_count_other';

    const latestVideo = videos.length > 0 ? videos[videos.length - 1] : null;

    const totalDurationSec = useMemo(() => {
        return videos.reduce((sum: number, v: Video) => sum + (v.duration ?? 0), 0);
    }, [videos]);
    const hasTotalDuration = totalDurationSec > 0;
    const isWatchLaterPlaylist = domain.playlist.isWatchLater(playlist);
    const displayName = isWatchLaterPlaylist ? t('playlist.watch_later_row') : playlist.name;

    const videosRegionId = `playlist-videos-${playlist.id}`;

    return (
        <div className={cn('playlist-card', isEmpty && 'playlist-card--empty')}>
            {/* Header click is a mouse convenience; the keyboard control is the focusable chevron button (aria-expanded). */}
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
            <div className="playlist-card__header" onClick={handleToggleExpand}>
                <div className={cn('playlist-card__cover', hasMultipleVideos && 'playlist-card__cover--stacked')} aria-hidden="true">
                    {latestVideo ? (
                        <img
                            className="playlist-card__cover-img"
                            src={latestVideo.thumbnail}
                            alt=""
                            loading="lazy"
                        />
                    ) : (
                        <div className="playlist-card__cover-placeholder">
                            <ListVideo size={24} strokeWidth={1.5} />
                        </div>
                    )}
                    {!isEmpty && (
                        <div className="playlist-card__cover-badge">
                            <ListVideo size={11} strokeWidth={2} />
                            <span>{videoCount}</span>
                        </div>
                    )}
                </div>

                {renaming ? (
                    // Wrapper only stops the click from bubbling to the header toggle; input + buttons inside are real controls.
                    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
                    <div className="playlist-card__rename-form" onClick={handleRenameFormClick}>
                        <Input
                            autoFocus
                            value={renameName}
                            onChange={handleRenameNameChange}
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
                            <span className="playlist-card__name">{displayName}</span>
                            <div className="playlist-card__stats">
                                {isEmpty ? (
                                    <span className="playlist-card__stats-empty">{t('playlist.empty_short')}</span>
                                ) : (
                                    <>
                                        <span>{t(countKey, { count: videoCount })}</span>
                                        {hasTotalDuration && (
                                            <>
                                                <span className="playlist-card__stats-dot" aria-hidden="true">·</span>
                                                <span>{formatDurationCompact(totalDurationSec as Seconds)}</span>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            {latestVideo && (
                                <div className="playlist-card__latest">
                                    <span className="playlist-card__latest-label">{t('playlist.latest_added')}:</span>
                                    <span className="playlist-card__latest-title">{latestVideo.title}</span>
                                </div>
                            )}
                        </div>
                        <div className="playlist-card__actions">
                            {!isWatchLaterPlaylist && (
                                <>
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
                                </>
                            )}
                            <button
                                type="button"
                                className="playlist-card__chevron"
                                aria-label={expanded ? t('common.collapse') : t('common.expand')}
                                aria-expanded={expanded}
                                aria-controls={videosRegionId}
                                onClick={handleChevronClick}
                            >
                                {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {expanded && (
                <div className="playlist-card__videos" id={videosRegionId}>
                    {videos.length === 0 ? (
                        <p className="playlist-card__empty">{t('playlist.empty_playlist')}</p>
                    ) : (
                        <Reorder.Group
                            axis="y"
                            values={playlist.videoIds}
                            onReorder={handleReorder}
                            className="playlist-card__reorder-group"
                        >
                            {videos.map((video, idx) => (
                                <Reorder.Item
                                    key={video.id}
                                    value={video.id}
                                    className="playlist-card__reorder-item"
                                >
                                    <PlaylistVideoRow video={video} playlistId={playlist.id} position={idx + 1} />
                                </Reorder.Item>
                            ))}
                        </Reorder.Group>
                    )}
                </div>
            )}

            <Modal
                isOpen={deleteConfirmOpen}
                onClose={handleDeleteCancel}
                title={t('playlist.delete')}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={handleDeleteCancel}>
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
