<?php

declare(strict_types=1);

namespace App\Http\Requests\Playlist;

use App\DTOs\UpdatePlaylistDTO;
use App\Http\Requests\Concerns\ValidatesPlaylistName;
use Illuminate\Foundation\Http\FormRequest;

/**
 * @property string $name
 */
class UpdatePlaylistRequest extends FormRequest
{
    use ValidatesPlaylistName;

    public function getDTO(): UpdatePlaylistDTO
    {
        return UpdatePlaylistDTO::fromRequest($this->validated());
    }
}
