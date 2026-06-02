<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Abstracts the physical storage operations needed during the video upload and
 * deletion workflows, decoupling the services from any concrete disk driver.
 *
 * Moves and directory management operate on the temporary ("local") disk where
 * freshly assembled uploads land; deletions operate on the published ("public")
 * disk where final renditions live.
 */
interface VideoStorageContract
{
    /**
     * Move a file from an absolute source path to a disk-relative destination.
     *
     * @param string $from Absolute filesystem path of the source file
     * @param string $to Destination path relative to the temporary disk
     *
     * @throws \App\Exceptions\VideoStorageException When the move fails
     */
    public function moveFile(string $from, string $to): void;

    /**
     * Delete a published file.
     *
     * @param string $path Path relative to the public disk
     */
    public function delete(string $path): void;

    /**
     * Delete a published directory and all of its contents.
     *
     * @param string $path Path relative to the public disk
     */
    public function deleteDirectory(string $path): void;

    /**
     * Ensure a directory exists on the temporary disk, creating it if missing.
     *
     * @param string $path Path relative to the temporary disk
     */
    public function ensureDirectoryExists(string $path): void;
}
