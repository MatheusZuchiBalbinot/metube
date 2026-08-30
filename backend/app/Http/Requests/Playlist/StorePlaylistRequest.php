<?php

declare(strict_types=1);

namespace App\Http\Requests\Playlist;

use App\DTOs\CreatePlaylistDTO;
use App\Http\Requests\Concerns\ValidatesPlaylistName;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property string $name
 */
class StorePlaylistRequest extends FormRequest
{
    use ValidatesPlaylistName;

    public function getDTO(): CreatePlaylistDTO
    {
        return CreatePlaylistDTO::fromRequest($this->validated());
    }
}
