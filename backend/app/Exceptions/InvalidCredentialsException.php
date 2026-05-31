<?php

declare(strict_types=1);

namespace App\Exceptions;

use Exception;

class InvalidCredentialsException extends Exception
{
    public function __construct()
    {
        parent::__construct(trans('auth.failed'));
    }
}
