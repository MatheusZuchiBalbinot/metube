<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\StorageContract;
use App\Exceptions\VideoStorageException;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Disk-agnostic implementation of {@see StorageContract}.
 *
 * This is the ONLY class in the application permitted to call Storage::disk().
 * The two disks it uses are resolved from config (filesystems.temp_disk /
 * filesystems.public_disk), so pointing storage at S3 is an env change
 * (FILESYSTEM_DISK / FILESYSTEM_DISK_PUBLIC) — no code change.
 */
final class StorageService implements StorageContract
{
    private readonly string $tempDisk;

    private readonly string $publicDisk;

    public function __construct()
    {
        $temp = config('filesystems.temp_disk');
        $public = config('filesystems.public_disk');

        $this->tempDisk = \is_string($temp) ? $temp : 'local';
        $this->publicDisk = \is_string($public) ? $public : 'public';
    }

    /**
     * Move a file from an absolute source path to a temp-disk-relative destination.
     *
     * Uses rename() for an O(1) move when source and destination share the same volume.
     *
     * @param string $from Absolute filesystem path of the source file
     * @param string $to Destination path relative to the temp disk
     *
     * @throws VideoStorageException When the move fails
     */
    public function moveFile(string $from, string $to): void
    {
        $destination = $this->tempPath($to);
        $moved = rename($from, $destination);

        if (!$moved) {
            throw VideoStorageException::moveFailed($from, $destination);
        }
    }

    /**
     * Resolve the absolute filesystem path for a temp-disk-relative path.
     *
     * @param string $path Path relative to the temp disk
     *
     * @return string Absolute filesystem path
     */
    public function tempPath(string $path): string
    {
        return Storage::disk($this->tempDisk)->path($path);
    }

    /**
     * Delete a file from the temp disk.
     *
     * @param string $path Path relative to the temp disk
     */
    public function deleteTempFile(string $path): void
    {
        Storage::disk($this->tempDisk)->delete($path);
    }

    /**
     * Ensure a directory exists on the temp disk, creating it if missing.
     *
     * @param string $path Path relative to the temp disk
     */
    public function ensureDirectoryExists(string $path): void
    {
        Storage::disk($this->tempDisk)->makeDirectory($path);
    }

    /**
     * Resolve the absolute filesystem path for a public-disk-relative path.
     *
     * @param string $path Path relative to the public disk
     *
     * @return string Absolute filesystem path
     */
    public function publicPath(string $path): string
    {
        return Storage::disk($this->publicDisk)->path($path);
    }

    /**
     * Resolve the public URL for a public-disk-relative path.
     *
     * Absolute URLs are returned untouched so externally-hosted media (e.g. seeded
     * sample videos and thumbnails) resolves correctly instead of being concatenated
     * onto the public disk base URL.
     *
     * @param string $path Path relative to the public disk, or an absolute URL
     *
     * @return string Full URL
     */
    public function publicUrl(string $path): string
    {
        if (Str::startsWith($path, ['http://', 'https://'])) {
            return $path;
        }

        return Storage::disk($this->publicDisk)->url($path);
    }

    /**
     * Write content to the public disk.
     *
     * @param string $path Path relative to the public disk
     * @param string $content File contents
     */
    public function putPublic(string $path, string $content): void
    {
        Storage::disk($this->publicDisk)->put($path, $content);
    }

    /**
     * Determine whether a file exists on the public disk.
     *
     * @param string $path Path relative to the public disk
     *
     * @return bool True when the file exists
     */
    public function existsPublic(string $path): bool
    {
        return Storage::disk($this->publicDisk)->exists($path);
    }

    /**
     * Delete a file from the public disk.
     *
     * @param string $path Path relative to the public disk
     */
    public function deleteFile(string $path): void
    {
        Storage::disk($this->publicDisk)->delete($path);
    }

    /**
     * Delete a directory and all of its contents from the public disk.
     *
     * @param string $path Path relative to the public disk
     */
    public function deleteDirectory(string $path): void
    {
        Storage::disk($this->publicDisk)->deleteDirectory($path);
    }
}
