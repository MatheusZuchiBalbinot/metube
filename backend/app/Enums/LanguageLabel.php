<?php

declare(strict_types=1);

namespace App\Enums;

enum LanguageLabel: string
{
    case PT = 'pt';
    case EN = 'en';
    case ES = 'es';
    case FR = 'fr';
    case DE = 'de';
    case IT = 'it';
    case JA = 'ja';
    case ZH = 'zh';
    case KO = 'ko';
    case RU = 'ru';
    case AR = 'ar';

    public function label(): string
    {
        return match ($this) {
            self::PT => 'Português',
            self::EN => 'English',
            self::ES => 'Español',
            self::FR => 'Français',
            self::DE => 'Deutsch',
            self::IT => 'Italiano',
            self::JA => '日本語',
            self::ZH => '中文',
            self::KO => '한국어',
            self::RU => 'Русский',
            self::AR => 'العربية',
        };
    }

    /**
     * Get label from BCP-47 language code (fallback to uppercase if not found).
     */
    public static function fromLangCode(string $lang): string
    {
        $case = self::tryFrom($lang);

        return $case !== null ? $case->label() : strtoupper($lang);
    }
}
