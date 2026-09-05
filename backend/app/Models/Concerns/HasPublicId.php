<?php

declare(strict_types=1);

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Model;

/**
 * Generates a public-facing identifier (vuid/puid/cuid/uuid) on creation when
 * the field is not already set.
 *
 * bootHasPublicId() is called automatically by Eloquent for every model using
 * this trait (see Model::bootTraits()) — no need to override boot()/call
 * parent::boot() in the consuming model just for this.
 */
trait HasPublicId
{
    protected static function bootHasPublicId(): void
    {
        static::creating(function (Model $model): void {
            $field = $model->publicIdField();

            if ($model->getAttribute($field) === null) {
                $model->setAttribute($field, $model->generatePublicId());
            }
        });
    }

    abstract protected function publicIdField(): string;

    abstract protected function generatePublicId(): string;
}
