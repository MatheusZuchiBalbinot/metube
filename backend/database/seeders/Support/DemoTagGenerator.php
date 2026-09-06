<?php

declare(strict_types=1);

namespace Database\Seeders\Support;

/**
 * Derives tags from a video's actual title instead of stamping every video in
 * a channel with that channel's tags — the original bug: "Docker for
 * developers" on a JavaScript-tagged channel ended up tagged `javascript`
 * even though it's about containers, because no tag was ever read from the
 * title itself.
 */
final class DemoTagGenerator
{
    /**
     * Keyword (matched case-insensitively as a substring of the title) => tags
     * to add when it appears. Built from the titles actually used in
     * channelDefinitions() — extend this list whenever a new title is added
     * without a matching keyword, rather than letting it silently fall back.
     *
     * @var array<string, list<string>>
     */
    private const KEYWORDS = [
        // programming
        'rest api' => ['api', 'backend'],
        'api' => ['api'],
        'typescript' => ['typescript', 'javascript'],
        'react' => ['react', 'javascript'],
        'docker' => ['docker', 'containers'],
        'clean architecture' => ['architecture'],
        'debug' => ['debugging'],
        'git' => ['git', 'version-control'],
        'test' => ['testing'],
        // gaming
        'indie game' => ['indie-games'],
        'speedrun' => ['speedrun'],
        'rpg' => ['rpg'],
        'retro console' => ['retro-gaming'],
        'boss fight' => ['boss-fights'],
        'gaming setup' => ['gaming-setup'],
        'souls-like' => ['souls-like'],
        // tech
        'ai in' => ['artificial-intelligence'],
        'laptop' => ['laptops'],
        'smartphone' => ['smartphones'],
        'camera shootout' => ['smartphones'],
        'risc-v' => ['hardware'],
        'gadget' => ['gadgets'],
        'charging' => ['gadgets'],
        'foldable' => ['foldables'],
        'linux' => ['linux'],
        // music
        'coding beat' => ['lofi'],
        'study mix' => ['lofi'],
        'synthwave' => ['synthwave'],
        'lo-fi' => ['lofi'],
        'lofi' => ['lofi'],
        'ambient' => ['ambient'],
        'jazz' => ['jazz'],
        'hip-hop' => ['hip-hop'],
        // travel
        'hiking' => ['hiking'],
        'trail' => ['hiking'],
        'mountain' => ['mountains'],
        'van life' => ['van-life'],
        'backpack' => ['backpacking'],
        'road trip' => ['road-trip'],
        'camping' => ['camping'],
        // cooking
        'pasta' => ['recipe'],
        'dinner' => ['recipe'],
        'cast iron' => ['cooking-technique'],
        'street food' => ['street-food'],
        'sourdough' => ['baking'],
        'knife' => ['knife-skills'],
        'pancake' => ['recipe'],
        // science
        'sky is' => ['physics'],
        'black hole' => ['astronomy'],
        'physics' => ['physics'],
        'vaccine' => ['biology'],
        'solar system' => ['astronomy'],
        'quantum' => ['physics'],
        'ecosystem' => ['biology'],
        // fitness
        'full body workout' => ['workout'],
        'mobility' => ['mobility'],
        'building muscle' => ['strength-training'],
        'running form' => ['running'],
        'meal prep' => ['nutrition'],
        'recovery' => ['recovery'],
        'posture' => ['posture'],
        'strength' => ['strength-training'],
        // photography
        'manual mode' => ['camera-settings'],
        'portrait' => ['portrait-photography'],
        'raw' => ['photo-editing'],
        'lens' => ['gear'],
        'composition' => ['composition'],
        'astrophotography' => ['astrophotography'],
        'street photography' => ['street-photography'],
        'color grading' => ['color-grading'],
        // finance
        'budget' => ['budgeting'],
        'index fund' => ['investing'],
        'emergency fund' => ['savings'],
        'spending' => ['money-mindset'],
        'debt' => ['debt'],
        'retirement' => ['retirement'],
        'side income' => ['side-hustle'],
        'investing' => ['investing'],
        // comedy
        'wifi' => ['sketch-comedy'],
        'group project' => ['relatable'],
        'tech support' => ['sketch-comedy'],
        'meeting' => ['office-humor'],
        'sketch' => ['sketch-comedy'],
        'improv' => ['improv'],
        'blooper' => ['bloopers'],
        // diy
        'desk' => ['woodworking'],
        'shelves' => ['diy-furniture'],
        'restore' => ['furniture-restoration'],
        'storage hack' => ['organization'],
        'resin' => ['resin-art'],
        'tool kit' => ['tools'],
        'paint like' => ['painting'],
        'smart home' => ['smart-home'],
    ];

    /**
     * @param list<string> $fallbackTags Used verbatim when no keyword matches.
     *
     * @return list<string>
     */
    public function forTitle(string $title, array $fallbackTags): array
    {
        $normalized = mb_strtolower($title);
        $matched = [];

        foreach (self::KEYWORDS as $keyword => $tags) {
            if (str_contains($normalized, $keyword)) {
                array_push($matched, ...$tags);
            }
        }

        $matched = array_values(array_unique($matched));

        return $matched !== [] ? $matched : $fallbackTags;
    }
}
