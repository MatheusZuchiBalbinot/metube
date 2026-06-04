<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\StorageContract;
use App\Exceptions\VideoStorageException;
use Illuminate\Support\Facades\Storage;

/**
 * Local-disk implementation of {@see StorageContract}.
 *
 * This is the ONLY class in the application permitted to call Storage::disk().
 * Every other service must interact with storage exclusively through this contract.
 * Swapping to S3 means binding a different implementation in AppServiceProvider
 * — no other file changes.
 */
final class StorageService implements StorageContract
{
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
        return Storage::disk('local')->path($path);
    }

    /**
     * Delete a file from the temp disk.
     *
     * @param string $path Path relative to the temp disk
     */
    public function deleteTempFile(string $path): void
    {
        Storage::disk('local')->delete($path);
    }

    /**
     * Ensure a directory exists on the temp disk, creating it if missing.
     *
     * @param string $path Path relative to the temp disk
     */
    public function ensureDirectoryExists(string $path): void
    {
        Storage::disk('local')->makeDirectory($path);
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
        return Storage::disk('public')->path($path);
    }

    /**
     * Resolve the public URL for a public-disk-relative path.
     *
     * @param string $path Path relative to the public disk
     *
     * @return string Full URL
     */
    public function publicUrl(string $path): string
    {
        return Storage::disk('public')->url($path);
    }

    /**
     * Write content to the public disk.
     *
     * @param string $path Path relative to the public disk
     * @param string $content File contents
     */
    public function putPublic(string $path, string $content): void
    {
        Storage::disk('public')->put($path, $content);
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
        return Storage::disk('public')->exists($path);
    }

    /**
     * Delete a file from the public disk.
     *
     * @param string $path Path relative to the public disk
     */
    public function deleteFile(string $path): void
    {
        Storage::disk('public')->delete($path);
    }

    /**
     * Delete a directory and all of its contents from the public disk.
     *
     * @param string $path Path relative to the public disk
     */
    public function deleteDirectory(string $path): void
    {
        Storage::disk('public')->deleteDirectory($path);
    }
}
