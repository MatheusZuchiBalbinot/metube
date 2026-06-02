<?php

declare(strict_types=1);

namespace App\Services\Storage;

use App\Contracts\VideoStorageContract;
use App\Exceptions\VideoStorageException;
use Illuminate\Support\Facades\Storage;

/**
 * Local-disk implementation of {@see VideoStorageContract}.
 *
 * Temporary uploads are moved on the "local" disk with rename() — an O(1)
 * operation since source and destination share the same volume — while
 * published files are removed from the "public" disk.
 */
final class LocalVideoStorage implements VideoStorageContract
{
    public function moveFile(string $from, string $to): void
    {
        $destination = $this->fullPath($to);
        $moved = rename($from, $destination);

        if (!$moved) {
            throw VideoStorageException::moveFailed($from, $destination);
        }
    }

    public function delete(string $path): void
    {
        Storage::disk('public')->delete($path);
    }

    public function deleteDirectory(string $path): void
    {
        Storage::disk('public')->deleteDirectory($path);
    }

    public function ensureDirectoryExists(string $path): void
    {
        Storage::disk('local')->makeDirectory($path);
    }

    /**
     * Resolve the absolute filesystem path for a temporary-disk-relative path.
     *
     * @param string $relativePath Path relative to the local disk
     *
     * @return string Absolute filesystem path
     */
    private function fullPath(string $relativePath): string
    {
        return Storage::disk('local')->path($relativePath);
    }
}
