import { useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListVideo, Plus } from '@components/icons/icons';
import PlaylistCard from '@components/playlist/card';
import EmptyState from '@ui/empty/empty';
import Button from '@ui/button/button';
import Modal from '@ui/modal/modal';
import Input from '@ui/input/input';
import './playlists.css';
import { usePlaylist, useVideoData } from '@hooks';
import type { Playlist, Video, VideoId } from '@models';

export default function PlaylistsPage() {
    const { t } = useTranslation();
    const { playlists, createPlaylist } = usePlaylist();
    const { videos } = useVideoData();
    const [searchParams] = useSearchParams();
    const openPlaylistId = searchParams.get('open');

    const [newModalOpen, setNewModalOpen] = useState(false);
    const [newName, setNewName] = useState('');

    const resolvePlaylistVideos = useCallback((videoIds: VideoId[]): Video[] => {
        return videoIds
            .map(id => videos.find((v: Video) => v.id === id))
            .filter((v: Video | undefined): v is Video => v !== undefined);
    }, [videos]);

    const playlistsWithVideos = useMemo(() => {
        return playlists
            .map((playlist: Playlist) => ({
                playlist,
                videos: resolvePlaylistVideos(playlist.videoIds ?? []),
            }));
    }, [playlists, resolvePlaylistVideos]);

    const hasPlaylists = playlistsWithVideos.length > 0;

    function handleOpenNewModal() {
        setNewName('');
        setNewModalOpen(true);
    }

    function handleCloseNewModal() {
        setNewModalOpen(false);
        setNewName('');
    }

    function handleCreatePlaylist() {
        const trimmed = newName.trim();
        const isEmpty = trimmed === '';
        if (isEmpty) {
            return;
        }
        createPlaylist(trimmed);
        handleCloseNewModal();
    }

    function handleInputKeyDown(e: React.KeyboardEvent) {
        const isEnter = e.key === 'Enter';
        if (isEnter) {
            handleCreatePlaylist();
        }
    }

    return (
        <div className="playlists-page">
            <div className="playlists-page__header">
                <h1 className="playlists-page__title">{t('nav.playlists')}</h1>
                <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<Plus size={14} />}
                    onClick={handleOpenNewModal}
                >
                    {t('playlist.new')}
                </Button>
            </div>

            {hasPlaylists ? (
                <div className="playlists-page__list">
                    {playlistsWithVideos.map(({ playlist, videos: resolved }) => (
                        <PlaylistCard
                            key={playlist.id}
                            playlist={playlist}
                            videos={resolved}
                            defaultExpanded={playlist.id === openPlaylistId}
                        />
                    ))}
                </div>
            ) : (
                <div className="playlists-page__empty-wrap">
                    <EmptyState
                        icon={<ListVideo size={40} strokeWidth={1.25} />}
                        title={t('playlist.empty_title')}
                        description={t('playlist.empty_desc')}
                        actionLabel={t('playlist.new')}
                        onAction={handleOpenNewModal}
                    />
                </div>
            )}

            <Modal
                isOpen={newModalOpen}
                onClose={handleCloseNewModal}
                title={t('playlist.new')}
                size="sm"
                footer={
                    <>
                        <Button variant="ghost" onClick={handleCloseNewModal}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="primary" onClick={handleCreatePlaylist}>
                            {t('playlist.create')}
                        </Button>
                    </>
                }
            >
                <Input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={handleInputKeyDown}
                    placeholder={t('playlist.name_placeholder')}
                />
            </Modal>
        </div>
    );
}
