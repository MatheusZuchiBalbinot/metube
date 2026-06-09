<?php

declare(strict_types=1);

namespace App\Contracts;

/**
 * Abstracts every physical disk operation in the video pipeline, decoupling
 * all services from the concrete disk driver.
 *
 * "Temp disk" = the 'local' disk (private, not web-accessible).
 * "Public disk" = the 'public' disk (web-accessible, symlinked to storage/app/public).
 *
 * Swapping to S3 is a single-file change: bind a new implementation in
 * AppServiceProvider::register() — no other file needs to change.
 */
interface StorageContract
{
    // ── Temp disk ──────────────────────────────────────────────────────────

    /**
     * Move a file from an absolute source path to a temp-disk-relative destination.
     *
     * @param string $from Absolute filesystem path of the source file
     * @param string $to Destination path relative to the temp disk
     *
     * @throws \App\Exceptions\VideoStorageException When the move fails
     */
    public function moveFile(string $from, string $to): void;

    /**
     * Resolve the absolute filesystem path for a temp-disk-relative path.
     *
     * @param string $path Path relative to the temp disk
     *
     * @return string Absolute filesystem path
     */
    public function tempPath(string $path): string;

    /**
     * Delete a file from the temp disk.
     *
     * @param string $path Path relative to the temp disk
     */
    public function deleteTempFile(string $path): void;

    /**
     * Ensure a directory exists on the temp disk, creating it if missing.
     *
     * @param string $path Path relative to the temp disk
     */
    public function ensureDirectoryExists(string $path): void;

    // ── Public disk ────────────────────────────────────────────────────────

    /**
     * Resolve the absolute filesystem path for a public-disk-relative path.
     *
     * Used when a third-party tool (e.g. ffmpeg) needs an absolute path to
     * write output files directly to the public disk.
     *
     * @param string $path Path relative to the public disk
     *
     * @return string Absolute filesystem path
     */
    public function publicPath(string $path): string;

    /**
     * Resolve the public URL for a public-disk-relative path.
     *
     * Values that are already absolute URLs (http/https) are returned untouched so
     * externally-hosted media resolves correctly.
     *
     * @param string $path Path relative to the public disk, or an absolute URL
     *
     * @return string Full URL (e.g. http://localhost/storage/videos/x.mp4)
     */
    public function publicUrl(string $path): string;

    /**
     * Write content to the public disk.
     *
     * @param string $path Path relative to the public disk
     * @param string $content File contents
     */
    public function putPublic(string $path, string $content): void;

    /**
     * Determine whether a file exists on the public disk.
     *
     * @param string $path Path relative to the public disk
     *
     * @return bool True when the file exists
     */
    public function existsPublic(string $path): bool;

    /**
     * Delete a file from the public disk.
     *
     * @param string $path Path relative to the public disk
     */
    public function deleteFile(string $path): void;

    /**
     * Delete a directory and all of its contents from the public disk.
     *
     * @param string $path Path relative to the public disk
     */
    public function deleteDirectory(string $path): void;
}
