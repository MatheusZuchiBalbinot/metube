<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

/**
 * Thrown by VideoUploadService::finalizeUpload() when a concurrent request
 * already holds (or just released) the finalization lock for the same tus
 * upload_key — i.e. the upload is already being (or has already been)
 * finalized into a Video record.
 */
class UploadAlreadyFinalizingException extends Exception
{
    public function __construct()
    {
        parent::__construct('This upload is already being finalized.');
    }
}
