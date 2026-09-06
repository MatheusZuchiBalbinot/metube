<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\AiSuggestionStatus;
use App\Enums\NotificationType;
use App\Enums\ReactionType;
use App\Enums\TranscriptionStatus;
use App\Enums\VideoStatus;
use App\Models\Comment;
use App\Models\CommentLike;
use App\Models\Playlist;
use App\Models\Transcription;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoAiSuggestion;
use App\Models\VideoProgress;
use App\Models\VideoSummary;
use App\Models\WatchHistory;
use App\Services\HlsTranscodeService;
use App\Services\VideoStorageService;
use Database\Seeders\Support\DemoCategoryCatalog;
use Database\Seeders\Support\DemoContentGenerator;
use Database\Seeders\Support\DemoTagGenerator;
use Database\Seeders\Support\DemoVideoContext;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Seeds a rich, demo-ready dataset: themed channels, ~115 videos that actually
 * play through real HLS packages (run through the same HlsTranscodeService
 * TranscodeVideoToHls uses in production — not just a raw file URL), on-topic
 * thumbnails/descriptions/summaries/transcripts/captions/comments generated
 * per video (not the same paragraph repeated for every video in a category —
 * see DemoContentGenerator), shorts, comment threads with likes, reactions
 * (including dislikes), pending AI suggestions and notifications that point at
 * real seeded records. Idempotent — safe to re-run via `php artisan db:seed`.
 */
class DemoContentSeeder extends Seeder
{
    /**
     * Real, currently-reachable source videos to transcode into demo HLS
     * packages. "long" sources (full Blender Foundation films, public domain,
     * hosted on archive.org) back regular videos; "short" ones (5-30s clips from
     * samplelib.com / test-videos.co.uk) back Shorts. The old pool
     * (commondatastorage.googleapis.com/gtv-videos-bucket) now 403s on every
     * file — Google revoked anonymous access to that legacy bucket — which was
     * the actual reason seeded videos didn't play.
     *
     * Known limitation: only 2 "long" sources exist, so every channel's ~8
     * long-form videos cycle between the same two films (Big Buck Bunny,
     * Elephants Dream) under different titles/thumbnails. Fixing this for real
     * needs more public-domain video sources; not worth faking with
     * lower-quality filler.
     *
     * @var array{long: list<string>, short: list<string>}
     */
    private const HLS_SOURCES = [
        'long' => [
            'https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4',
            'https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4',
        ],
        'short' => [
            'https://download.samplelib.com/mp4/sample-5s.mp4',
            'https://download.samplelib.com/mp4/sample-10s.mp4',
            'https://download.samplelib.com/mp4/sample-15s.mp4',
            'https://download.samplelib.com/mp4/sample-20s.mp4',
            'https://download.samplelib.com/mp4/sample-30s.mp4',
            'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
            'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4',
            'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4',
        ],
    ];

    /**
     * Generic acknowledgment replies — unlike comments, a creator's reply to a
     * comment doesn't need to be category-specific ("thanks for watching" reads
     * fine under a cooking video or a finance one).
     *
     * @var list<string>
     */
    private const REPLY_TEMPLATES = [
        'Thanks for watching — glad it helped!',
        'Appreciate the kind words, more coming soon.',
        'Noted, working on the audio levels for the next one!',
        'Glad you stuck around till the end 🙌',
    ];

    /** Running index used to cycle the video pool and spread publish dates. */
    private int $cursor = 0;

    private readonly DemoContentGenerator $generator;

    private readonly DemoTagGenerator $tagGenerator;

    public function __construct()
    {
        $this->generator = new DemoContentGenerator();
        $this->tagGenerator = new DemoTagGenerator();
    }

    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@metube.com'],
            ['name' => 'Admin', 'password' => 'password'],
        );

        $hlsPool = $this->provisionHlsPackages();

        $channels = $this->seedChannels();
        $videos = $this->seedVideos($channels, $hlsPool);
        $adminVideos = $this->seedAdminVideos($admin, $hlsPool);

        $categoryByChannelId = $channels->mapWithKeys(
            fn (array $c): array => [$c['user']->id => $c['tags'][0]],
        );
        $categoryByChannelId->put($admin->id, 'meta');

        // orderBy('id') matters beyond readability: seedComments() derives "every
        // other video" from this collection's index order, and without an
        // explicit order Postgres doesn't guarantee the same row order between
        // runs — which video landed on which side of that split silently
        // shifted from one re-seed to the next.
        $published = Video::whereIn('channel_id', [...$channels->pluck('user.id'), $admin->id])
            ->where('status', VideoStatus::PUBLISHED)
            ->orderBy('id')
            ->get();

        $this->seedAiLayer($published, $categoryByChannelId);
        $this->seedEngagement($admin, $channels, $published, $categoryByChannelId);
        $this->seedAiSuggestions($admin);
        $this->seedNotifications($admin, $channels->map(fn (array $c) => $c['user']), $adminVideos);

        unset($videos);
    }

    /**
     * Downloads each unique demo source once and runs it through the real
     * HlsTranscodeService — the same class TranscodeVideoToHls uses in
     * production — so seeded videos actually exercise HLS/adaptive playback
     * instead of pointing at a raw file (which is also what the Shaka Player
     * frontend integration expects for anything long-lived: real published
     * videos always end up HLS-only, per TranscodeVideoToHls nulling video_url
     * once the package is built). Idempotent: skips sources whose HLS package
     * already exists, reading the cached duration back from a sidecar file
     * instead of re-probing the manifest.
     *
     * @return array{long: list<array{hlsUrl: string, duration: float}>, short: list<array{hlsUrl: string, duration: float}>}
     */
    private function provisionHlsPackages(): array
    {
        $hls = app(HlsTranscodeService::class);
        $storage = app(VideoStorageService::class);
        $result = ['long' => [], 'short' => []];

        foreach (self::HLS_SOURCES as $pool => $urls) {
            foreach ($urls as $i => $url) {
                $key = "demo-{$pool}-{$i}";
                $masterRelPath = "hls/{$key}/master.m3u8";
                $metaRelPath = "hls/{$key}/demo-meta.json";
                $metaAbsPath = $storage->absolutePublicPath($metaRelPath);

                if ($storage->exists($masterRelPath) && is_file($metaAbsPath)) {
                    $meta = json_decode((string) file_get_contents($metaAbsPath), true);
                    $result[$pool][] = ['hlsUrl' => $masterRelPath, 'duration' => (float) $meta['duration']];

                    continue;
                }

                $this->command->info("Transcoding demo HLS source {$key}...");

                $tmpAbsPath = Storage::disk('local')->path("uploads/tmp/{$key}.mp4");
                $tmpDir = dirname($tmpAbsPath);

                if (!is_dir($tmpDir)) {
                    mkdir($tmpDir, 0755, true);
                }

                copy($url, $tmpAbsPath);

                $duration = $hls->probeDuration($tmpAbsPath) ?? 10.0;
                $hlsUrl = $hls->transcode($tmpAbsPath, $key);

                @unlink($tmpAbsPath);
                file_put_contents($metaAbsPath, json_encode(['duration' => $duration]));

                $result[$pool][] = ['hlsUrl' => $hlsUrl, 'duration' => $duration];
            }
        }

        return $result;
    }

    /**
     * Create the themed demo channels.
     *
     * @return Collection<int, array{user: User, tags: list<string>, titles: list<string>}>
     */
    private function seedChannels(): Collection
    {
        // Built as a plain array first rather than collect()->map(): passing the
        // shaped definition through collect() widens it to
        // array<string, list<string>|string>, which PHPStan then can't reconcile
        // with this method's declared return shape.
        $channels = [];

        foreach ($this->channelDefinitions() as $def) {
            $user = User::query()->firstOrCreate(
                ['email' => $def['email']],
                [
                    'name' => $def['name'],
                    'password' => 'password',
                    'bio' => $def['bio'],
                    'avatar' => 'https://i.pravatar.cc/300?u=' . urlencode($def['email']),
                ],
            );

            $channels[] = ['user' => $user, 'tags' => $def['tags'], 'titles' => $def['titles']];
        }

        return collect($channels);
    }

    /**
     * Create the published catalogue (regular videos + one short per channel),
     * cycling real HLS packages from the provisioned pool. Each video's tags
     * are derived from its own title via DemoTagGenerator — not copied
     * verbatim from the channel — so a video about containers doesn't end up
     * tagged `javascript` just because the channel mostly covers JavaScript.
     *
     * @param Collection<int, array{user: User, tags: list<string>, titles: list<string>}> $channels
     * @param array{long: list<array{hlsUrl: string, duration: float}>, short: list<array{hlsUrl: string, duration: float}>} $hlsPool
     *
     * @return Collection<int, Video>
     */
    private function seedVideos(Collection $channels, array $hlsPool): Collection
    {
        $videos = collect();

        foreach ($channels as $channel) {
            $category = $channel['tags'][0];

            foreach ($channel['titles'] as $title) {
                $tags = $this->tagGenerator->forTitle($title, $channel['tags']);
                $source = $hlsPool['long'][$this->cursor % count($hlsPool['long'])];
                $videos->push($this->makeVideo($channel['user'], $title, $tags, $category, [
                    'hls_url' => $source['hlsUrl'],
                    'duration' => $source['duration'],
                ]));
            }

            // 'shorts' is a format tag, not a topical one — always appended
            // regardless of what DemoTagGenerator matched in the (generic)
            // short title, so the Shorts feed filter never loses a video.
            $shortTitle = ucfirst($category) . ' in 60 seconds';
            $shortTags = [...$this->tagGenerator->forTitle($shortTitle, $channel['tags']), 'shorts'];
            $source = $hlsPool['short'][$this->cursor % count($hlsPool['short'])];
            $videos->push($this->makeVideo($channel['user'], $shortTitle, $shortTags, $category, [
                'hls_url' => $source['hlsUrl'],
                'duration' => $source['duration'],
            ]));
        }

        return $videos;
    }

    /**
     * Give the admin a couple of published (and actually playable) videos, plus
     * one of each non-published status, so every state is visible on their
     * profile during local testing.
     *
     * @param array{long: list<array{hlsUrl: string, duration: float}>, short: list<array{hlsUrl: string, duration: float}>} $hlsPool
     *
     * @return array{welcome: Video, devlog: Video} The two published admin videos,
     *                                              needed to point demo notifications
     *                                              at real records instead of a
     *                                              placeholder vuid.
     */
    private function seedAdminVideos(User $admin, array $hlsPool): array
    {
        $first = $hlsPool['long'][0];
        $second = $hlsPool['long'][1 % count($hlsPool['long'])];

        $welcome = $this->makeVideo($admin, 'Welcome to MeTube', ['meta', 'announcement'], 'meta', [
            'hls_url' => $first['hlsUrl'],
            'duration' => $first['duration'],
        ]);
        $devlog = $this->makeVideo($admin, 'Behind the scenes of the platform', ['meta', 'devlog'], 'meta', [
            'hls_url' => $second['hlsUrl'],
            'duration' => $second['duration'],
        ]);

        // Non-published states never reach the transcode step in the real
        // pipeline, so these intentionally have no hls_url/video_url either.
        // `views` is likewise forced to 0 — makeVideo()'s default is a random
        // count meant for genuinely published demo content, and content that
        // was never public shouldn't appear to have accrued real viewers.
        $this->makeVideo($admin, 'Upcoming: roadmap reveal', ['meta'], 'meta', [
            'status' => VideoStatus::SCHEDULED,
            'scheduled_at' => now()->addDays(3),
            'published_at' => null,
            'views' => 0,
        ]);
        $this->makeVideo($admin, 'Draft: editing in progress', ['meta'], 'meta', [
            'status' => VideoStatus::DRAFT,
            'published_at' => null,
            'views' => 0,
        ]);
        $this->makeVideo($admin, 'Processing demo upload', ['meta'], 'meta', [
            'status' => VideoStatus::PROCESSING,
            'published_at' => null,
            'views' => 0,
        ]);
        $this->makeVideo($admin, 'Livestream replay (upload failed)', ['meta'], 'meta', [
            'status' => VideoStatus::FAILED,
            'published_at' => null,
            'views' => 0,
        ]);

        return ['welcome' => $welcome, 'devlog' => $devlog];
    }

    /**
     * Create (or refresh) a single video, spreading publish dates and building
     * an on-topic description + a thumbnail that shows the actual title instead
     * of an unrelated stock photo. video_url stays null by default — matching
     * the real pipeline's steady state, where a fully processed video is
     * HLS-only — unless a caller overrides it.
     *
     * @param list<string> $tags
     * @param array<string, mixed> $overrides
     */
    private function makeVideo(User $channel, string $title, array $tags, string $category, array $overrides = []): Video
    {
        $index = $this->cursor++;
        $context = new DemoVideoContext($category, $title, $index, $tags);
        $bank = DemoCategoryCatalog::get($category);

        $video = Video::updateOrCreate(
            ['channel_id' => $channel->id, 'title' => $title],
            array_merge([
                'description' => $this->generator->description($context, $bank),
                'tags' => $tags,
                'status' => VideoStatus::PUBLISHED,
                'duration' => fake()->numberBetween(240, 1800),
                // Both derived from the context seed rather than fake() — a view
                // count or publish date that reshuffled on every re-seed (fake()
                // isn't seeded here) made the feed's sort order and displayed
                // numbers drift for no reason each time you ran the seeder again.
                'views' => 800 + ($context->seed() % 249_201),
                'video_url' => null,
                'hls_url' => null,
                'published_at' => now()->subDays($index * 4 + ($context->seed() % 4)),
                'scheduled_at' => null,
            ], $overrides),
        );

        // thumbnail_url needs the video's real vuid (assigned by HasPublicId on
        // create, not mass-assignable), so it's rendered and attached in a
        // second pass rather than inside the array above.
        $hasExplicitThumbnail = array_key_exists('thumbnail_url', $overrides);

        if (!$hasExplicitThumbnail) {
            $video->update(['thumbnail_url' => $this->buildThumbnail($category, $title, $video->vuid)]);
        }

        return $video;
    }

    /**
     * Renders a category-tinted SVG cover and writes it to the public disk,
     * returning the disk-relative path (matching the real pipeline's
     * `thumbnails/{vuid}.ext` convention). Generated locally instead of
     * pulled from a third-party placeholder service (placehold.co's flat
     * color-and-text boxes) so the demo catalogue has an actual visual
     * identity per category and doesn't depend on that service being up.
     */
    private function buildThumbnail(string $category, string $title, string $vuid): string
    {
        $svg = $this->buildThumbnailSvg($category, $title);
        $path = "thumbnails/{$vuid}.svg";

        Storage::disk('public')->put($path, $svg);

        return $path;
    }

    /**
     * 640x360 cover: a diagonal gradient in the category's two-tone palette, a
     * large low-opacity glyph as a watermark, and the title set over a bottom
     * scrim for contrast — the same layered composition real thumbnail
     * generators use, so every category reads as a distinct, intentional brand
     * instead of a generic colored rectangle.
     */
    private function buildThumbnailSvg(string $category, string $title): string
    {
        $bank = DemoCategoryCatalog::get($category);
        [$bg, $fg] = $bank->color;
        // The 'programming' icon is the literal string '</>' — embedded raw,
        // those characters are parsed as actual markup (closing the <text> tag
        // mid-attribute), corrupting the whole document into a blank/black
        // image. Every other category's icon is a single safe Unicode glyph,
        // which is exactly why only programming-category thumbnails broke.
        $icon = htmlspecialchars($bank->icon, ENT_QUOTES | ENT_XML1);
        $label = strtoupper($category);

        $lines = $this->wrapTitle($title, 24);
        $lineHeight = 42;
        $lastLineY = 318;
        $firstLineY = $lastLineY - ($lineHeight * (count($lines) - 1));

        $tspans = '';

        foreach ($lines as $i => $line) {
            $y = $firstLineY + $i * $lineHeight;
            $tspans .= sprintf(
                '<tspan x="36" y="%d">%s</tspan>',
                $y,
                htmlspecialchars($line, ENT_QUOTES | ENT_XML1),
            );
        }

        $labelWidth = 20 + (strlen($label) * 11);

        return <<<SVG
        <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
            <defs>
                <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stop-color="#{$bg}"/>
                    <stop offset="1" stop-color="#000000"/>
                </linearGradient>
                <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stop-color="#000000" stop-opacity="0"/>
                    <stop offset="1" stop-color="#000000" stop-opacity="0.82"/>
                </linearGradient>
            </defs>
            <rect width="640" height="360" fill="url(#bg)"/>
            <circle cx="540" cy="90" r="190" fill="#{$fg}" opacity="0.16"/>
            <text x="480" y="230" font-family="Arial, sans-serif" font-size="220" font-weight="700"
                fill="#{$fg}" opacity="0.22" text-anchor="middle">{$icon}</text>
            <rect x="0" y="190" width="640" height="170" fill="url(#scrim)"/>
            <rect x="36" y="26" width="{$labelWidth}" height="30" rx="15" fill="#{$fg}"/>
            <text x="{$this->svgHalf($labelWidth, 36)}" y="47" font-family="Arial, sans-serif" font-size="14"
                font-weight="700" letter-spacing="1" fill="#{$bg}" text-anchor="middle">{$label}</text>
            <text font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#ffffff">{$tspans}</text>
        </svg>
        SVG;
    }

    private function svgHalf(int $width, int $offsetX): int
    {
        return $offsetX + intdiv($width, 2);
    }

    /**
     * Greedy word-wrap for SVG <text>, which never wraps on its own. Capped at
     * 2 lines (longer titles are truncated with an ellipsis) so the wrapped
     * block always fits above the bottom scrim regardless of title length.
     *
     * @return list<string>
     */
    private function wrapTitle(string $title, int $maxChars): array
    {
        $words = explode(' ', $title);
        $lines = [];
        $current = '';

        foreach ($words as $word) {
            $candidate = $current === '' ? $word : "{$current} {$word}";

            if (strlen($candidate) > $maxChars && $current !== '') {
                $lines[] = $current;
                $current = $word;
            } else {
                $current = $candidate;
            }

            if (count($lines) === 2) {
                break;
            }
        }

        $hasRemainder = $current !== '' && count($lines) < 2;

        if ($hasRemainder) {
            $lines[] = $current;
        }

        $isTruncated = count($lines) === 2 && strlen(implode(' ', $words)) > array_sum(array_map('strlen', $lines)) + 1;

        if ($isTruncated) {
            $lines[1] = rtrim(substr($lines[1], 0, $maxChars - 1)) . '…';
        }

        return $lines;
    }

    /**
     * Attach on-topic AI summaries, transcriptions and captions to every published
     * video — not just the top few by view count — so every watch page has
     * chapters, key points and a transcript to show. Chapter timestamps are scaled
     * to each video's actual duration instead of using fixed placeholder times.
     *
     * @param Collection<int, Video> $published
     * @param Collection<int, string> $categoryByChannelId
     */
    private function seedAiLayer(Collection $published, Collection $categoryByChannelId): void
    {
        foreach ($published as $video) {
            $category = $categoryByChannelId->get($video->channel_id, 'meta');
            $bank = DemoCategoryCatalog::get($category);
            $duration = $video->duration ?? 300.0;
            // Index doesn't affect DemoVideoContext::seed() (it hashes category +
            // title only), so 0 here still reproduces the exact variation picked
            // for this same video back in makeVideo().
            $context = new DemoVideoContext($category, $video->title, 0, []);

            VideoSummary::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'key_points' => $this->generator->keyPoints($context, $bank),
                    'chapters' => $this->generator->chapters($context, $bank, $duration),
                    'reading_mode' => $this->generator->readingMode($context, $bank),
                ],
            );

            $transcriptSentences = $this->generator->transcriptSentences($context, $bank);

            Transcription::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'language' => 'en',
                    'content' => implode(' ', $transcriptSentences),
                    'vtt' => $this->buildVtt($transcriptSentences, $duration),
                    'status' => TranscriptionStatus::COMPLETED,
                    'started_at' => now()->subDays(1),
                ],
            );

            $video->update([
                'captions' => [[
                    'lang' => 'en',
                    'label' => 'English',
                    'url' => "captions/{$video->vuid}.en.vtt",
                ]],
            ]);
        }
    }

    /**
     * @param list<string> $sentences
     */
    private function buildVtt(array $sentences, float $duration): string
    {
        $count = count($sentences);
        $segment = $duration / max($count, 1);
        $lines = ['WEBVTT', ''];

        foreach ($sentences as $i => $sentence) {
            $lines[] = "{$this->vttTime($i * $segment)} --> {$this->vttTime(($i + 1) * $segment)}";
            $lines[] = $sentence;
            $lines[] = '';
        }

        return implode("\n", $lines);
    }

    private function vttTime(float $seconds): string
    {
        $hours = (int) floor($seconds / 3600);
        $minutes = (int) floor(($seconds % 3600) / 60);
        $secs = $seconds - ($hours * 3600) - ($minutes * 60);

        return sprintf('%02d:%02d:%06.3f', $hours, $minutes, $secs);
    }

    /**
     * Wire up subscriptions, reactions (likes + dislikes), watch history/progress,
     * comments (with likes) and playlists so the home feed, recommendations and
     * library views are populated.
     *
     * @param Collection<int, array{user: User, tags: list<string>, titles: list<string>}> $channels
     * @param Collection<int, Video> $published
     * @param Collection<int, string> $categoryByChannelId
     */
    private function seedEngagement(User $admin, Collection $channels, Collection $published, Collection $categoryByChannelId): void
    {
        $channelUsers = $channels->map(fn (array $c) => $c['user']);

        $this->seedSubscriptions($admin, $channelUsers);
        $this->seedReactions($admin, $channelUsers, $published);
        $this->seedHistory($admin, $published);
        $this->seedPlaylists($admin, $published);
        $this->seedComments($admin, $channelUsers, $published, $categoryByChannelId);
    }

    /**
     * @param Collection<int, User> $channelUsers
     */
    private function seedSubscriptions(User $admin, Collection $channelUsers): void
    {
        $admin->subscriptions()->syncWithoutDetaching($channelUsers->take(4)->pluck('id')->all());

        foreach ($channelUsers as $user) {
            $others = $channelUsers->where('id', '!=', $user->id);
            $picks = $this->stablePick($others, 2, "subscriptions:{$user->id}", fn (User $u): int => $u->id);
            $user->subscriptions()->syncWithoutDetaching($picks->pluck('id')->all());
        }
    }

    /**
     * @param Collection<int, User> $channelUsers
     * @param Collection<int, Video> $published
     */
    private function seedReactions(User $admin, Collection $channelUsers, Collection $published): void
    {
        $likable = $this->stablePick($published, 10, 'admin-likes', fn (Video $v): int => $v->id);

        foreach ($likable as $video) {
            $admin->reactions()->syncWithoutDetaching([$video->id => ['type' => ReactionType::LIKE->value]]);
        }

        // A handful of videos get an honest dislike too — an all-likes demo dataset
        // doesn't reflect what a real reactions table looks like.
        $remaining = $published->whereNotIn('id', $likable->pluck('id'));
        $dislikable = $this->stablePick($remaining, 4, 'admin-dislikes', fn (Video $v): int => $v->id);

        foreach ($dislikable as $video) {
            $admin->reactions()->syncWithoutDetaching([$video->id => ['type' => ReactionType::DISLIKE->value]]);
        }

        foreach ($channelUsers as $user) {
            $likeable = $published->where('channel_id', '!=', $user->id);

            if ($likeable->isEmpty()) {
                continue;
            }

            $picks = $this->stablePick($likeable, 5, "user-likes:{$user->id}", fn (Video $v): int => $v->id);

            foreach ($picks as $video) {
                $user->reactions()->syncWithoutDetaching([$video->id => ['type' => ReactionType::LIKE->value]]);
            }
        }
    }

    /**
     * @param Collection<int, Video> $published
     */
    private function seedHistory(User $admin, Collection $published): void
    {
        $hour = 0;
        $watched = $this->stablePick($published, 12, 'watch-history', fn (Video $v): int => $v->id);

        foreach ($watched as $video) {
            WatchHistory::updateOrCreate(
                ['user_id' => $admin->id, 'video_id' => $video->id],
                ['watched_at' => now()->subHours(++$hour)],
            );

            VideoProgress::updateOrCreate(
                ['user_id' => $admin->id, 'video_id' => $video->id],
                ['percent' => fake()->numberBetween(5, 95)],
            );
        }
    }

    /**
     * @param Collection<int, Video> $published
     */
    private function seedPlaylists(User $admin, Collection $published): void
    {
        $watchLater = $admin->getWatchLaterPlaylist();
        $this->fillPlaylist($watchLater, $this->stablePick($published, 5, 'watch-later', fn (Video $v): int => $v->id));

        $favorites = $admin->playlists()->firstOrCreate(['name' => 'Favorites']);
        $this->fillPlaylist($favorites, $this->stablePick($published, 6, 'favorites', fn (Video $v): int => $v->id));
    }

    /**
     * A stable stand-in for `Collection::random($n)`, which draws a different
     * subset on every call with no way to seed it — re-seeding the database
     * kept adding more subscriptions/reactions/history/playlist rows forever
     * instead of converging on a stable dataset, because each run's random
     * pick barely overlapped with the last one. Sorting by a hash of a stable
     * key (plus a call-site salt, so e.g. admin's likes and dislikes don't
     * correlate) makes the pick — and therefore the seeded dataset — the same
     * every time.
     *
     * @template T
     *
     * @param Collection<int, T> $items
     * @param callable(T): int $keyOf
     *
     * @return Collection<int, T>
     */
    private function stablePick(Collection $items, int $count, string $salt, callable $keyOf): Collection
    {
        return $items
            ->sortBy(fn (mixed $item): int => crc32($salt . ':' . $keyOf($item)))
            ->take($count)
            ->values();
    }

    /**
     * @param Collection<int, Video> $videos
     */
    private function fillPlaylist(Playlist $playlist, Collection $videos): void
    {
        $attach = [];
        $position = 0;

        foreach ($videos as $video) {
            $attach[$video->id] = ['position' => $position++];
        }

        $playlist->videos()->syncWithoutDetaching($attach);
    }

    /**
     * Comments roughly half of the published catalogue (every other video, by
     * publish order — deterministic, so re-seeding doesn't churn the selection),
     * with 2-5 comments each, some replies, and a handful of comment likes so
     * like counts aren't all zero. Comment text is drawn from the video's own
     * category bank (via DemoContentGenerator), not a single global pool — a
     * cooking video's comments read like cooking-video comments.
     *
     * @param Collection<int, User> $channelUsers
     * @param Collection<int, Video> $published
     * @param Collection<int, string> $categoryByChannelId
     */
    private function seedComments(User $admin, Collection $channelUsers, Collection $published, Collection $categoryByChannelId): void
    {
        $authors = $channelUsers->push($admin)->values();

        foreach ($published->values() as $index => $video) {
            $shouldComment = $index % 2 === 0;

            if (!$shouldComment || Comment::where('video_id', $video->id)->exists()) {
                continue;
            }

            $commenters = $authors->where('id', '!=', $video->channel_id)->values();

            if ($commenters->isEmpty()) {
                continue;
            }

            $category = $categoryByChannelId->get($video->channel_id, 'meta');
            $bank = DemoCategoryCatalog::get($category);
            $context = new DemoVideoContext($category, $video->title, $index, []);

            $commentCount = 2 + ($index % 4);
            $picked = $commenters->count() >= $commentCount
                ? $commenters->random($commentCount)
                : $commenters;

            $texts = $this->generator->comments($context, $bank, count($picked));
            $threadStarter = null;

            foreach (collect($picked)->values() as $i => $author) {
                $comment = Comment::create([
                    'user_id' => $author->id,
                    'video_id' => $video->id,
                    'parent_id' => null,
                    'content' => $texts[$i] ?? $texts[$i % max(count($texts), 1)],
                ]);
                $video->increment('comments_count');
                $threadStarter ??= $comment;

                $this->maybeLikeComment($comment, $commenters, $i);
            }

            if ($threadStarter !== null && $index % 3 === 0) {
                $reply = Comment::create([
                    'user_id' => $video->channel_id,
                    'video_id' => $video->id,
                    'parent_id' => $threadStarter->id,
                    'content' => self::REPLY_TEMPLATES[$index % count(self::REPLY_TEMPLATES)],
                ]);
                $threadStarter->increment('replies_count');
                $video->increment('comments_count');

                $this->maybeLikeComment($reply, $commenters, $index);
            }
        }
    }

    /**
     * Every third comment gets 1-2 likes from other users, so comment cards show
     * realistic non-zero like counts instead of a flat zero everywhere.
     *
     * @param Collection<int, User> $possibleLikers
     */
    private function maybeLikeComment(Comment $comment, Collection $possibleLikers, int $seed): void
    {
        if ($seed % 3 !== 0) {
            return;
        }

        $likers = $possibleLikers->where('id', '!=', $comment->user_id);

        if ($likers->isEmpty()) {
            return;
        }

        $chosen = $likers->random(min(2, $likers->count()));
        $ids = collect($chosen)->pluck('id')->all();

        // Not $comment->likes()->syncWithoutDetaching(): that relation declares
        // withTimestamps(), but comment_likes only has created_at (no updated_at) —
        // same insertOrIgnore() pattern CommentService::toggleLike() uses.
        foreach ($ids as $userId) {
            CommentLike::insertOrIgnore(['user_id' => $userId, 'comment_id' => $comment->id, 'created_at' => now()]);
        }

        $comment->update(['likes_count' => count($ids)]);
    }

    /**
     * Pending AI suggestions on the admin's not-yet-published videos, so the
     * "review AI suggestion" flow has something to show without waiting on a real
     * AI provider call.
     */
    private function seedAiSuggestions(User $admin): void
    {
        $candidates = Video::where('channel_id', $admin->id)
            ->whereIn('status', [VideoStatus::DRAFT, VideoStatus::PROCESSING])
            ->get();

        $bank = DemoCategoryCatalog::get('meta');

        foreach ($candidates as $video) {
            $context = new DemoVideoContext('meta', $video->title, 0, []);

            VideoAiSuggestion::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'suggested_title' => $video->title . ' — Full Walkthrough',
                    'suggested_description' => $this->generator->description($context, $bank),
                    'suggested_tags' => ['meta', 'metube', 'platform-update'],
                    'status' => AiSuggestionStatus::PENDING,
                ],
            );
        }
    }

    /**
     * A handful of database notifications for the admin (mix of read/unread) so
     * the notification bell isn't empty on first login. Inserted directly rather
     * than via ->notify() so seeding never depends on a live broadcast connection.
     * Every notification points at a real seeded video/comment — clicking one
     * used to 404 because the payload hardcoded vuid/cuid as the literal string
     * 'demo', which never matched any actual record.
     *
     * @param Collection<int, User> $channelUsers
     * @param array{welcome: Video, devlog: Video} $adminVideos
     */
    private function seedNotifications(User $admin, Collection $channelUsers, array $adminVideos): void
    {
        if ($admin->notifications()->exists()) {
            return;
        }

        $firstChannel = $channelUsers->first() ?? $admin;
        $secondChannel = $channelUsers->get(1) ?? $firstChannel;

        // Prefer a reply so "X replied to your comment" reads coherently; fall
        // back to any comment that exists so the link still resolves even in
        // the (statistically unlikely) case no reply landed on an admin video.
        $replyComment = Comment::query()->whereNotNull('parent_id')->inRandomOrder()->first()
            ?? Comment::query()->inRandomOrder()->first();

        $entries = [
            [
                'type' => NotificationType::NEW_SUBSCRIBER,
                'data' => ['type' => NotificationType::NEW_SUBSCRIBER->value, 'subscriber_name' => $firstChannel->name],
                'age' => now()->subHours(2),
                'read' => false,
            ],
            [
                'type' => NotificationType::VIDEO_LIKED,
                'data' => [
                    'type' => NotificationType::VIDEO_LIKED->value,
                    'liker_name' => $secondChannel->name,
                    'vuid' => $adminVideos['welcome']->vuid,
                    'video_title' => $adminVideos['welcome']->title,
                    'thumbnail_url' => $adminVideos['welcome']->thumbnail_url,
                ],
                'age' => now()->subHours(5),
                'read' => false,
            ],
            [
                'type' => NotificationType::VIDEO_AI_SUMMARY_READY,
                'data' => [
                    'type' => NotificationType::VIDEO_AI_SUMMARY_READY->value,
                    'vuid' => $adminVideos['devlog']->vuid,
                    'video_title' => $adminVideos['devlog']->title,
                    'thumbnail_url' => $adminVideos['devlog']->thumbnail_url,
                ],
                'age' => now()->subDays(2),
                'read' => true,
            ],
        ];

        if ($replyComment !== null) {
            $entries[] = [
                'type' => NotificationType::COMMENT_REPLIED,
                'data' => [
                    'type' => NotificationType::COMMENT_REPLIED->value,
                    'replier_name' => $firstChannel->name,
                    'cuid' => $replyComment->cuid,
                    'vuid' => $replyComment->video->vuid,
                ],
                'age' => now()->subDay(),
                'read' => true,
            ];
        }

        foreach ($entries as $entry) {
            $admin->notifications()->create([
                'id' => (string) Str::uuid(),
                'type' => 'App\\Notifications\\' . Str::studly($entry['type']->value) . 'Notification',
                'data' => $entry['data'],
                'read_at' => $entry['read'] ? $entry['age'] : null,
                'created_at' => $entry['age'],
                'updated_at' => $entry['age'],
            ]);
        }
    }

    /**
     * @return list<array{email: string, name: string, bio: string, tags: list<string>, titles: list<string>}>
     */
    private function channelDefinitions(): array
    {
        return [
            [
                'email' => 'code@metube.com',
                'name' => 'Code with Bun',
                'bio' => 'Practical programming tutorials and clean-code deep dives.',
                'tags' => ['programming', 'javascript', 'tutorial'],
                'titles' => [
                    'Build a REST API in 20 minutes',
                    'TypeScript tips you wish you knew',
                    'React Server Components explained',
                    'Docker for developers',
                    'Clean architecture in practice',
                    'Debugging like a pro',
                    'Git workflows that actually scale',
                    'Testing without the tears',
                ],
            ],
            [
                'email' => 'pixel@metube.com',
                'name' => 'Pixel Pilgrim',
                'bio' => 'Game reviews, speedruns and cozy retro corners.',
                'tags' => ['gaming', 'gameplay', 'review'],
                'titles' => [
                    'Top 10 indie games of the year',
                    'Speedrun world record breakdown',
                    'Is this the best RPG ever?',
                    'Retro consoles worth collecting',
                    'Boss fights that broke me',
                    'Building the ultimate gaming setup',
                    'Hidden gems under five dollars',
                    'Every souls-like, ranked',
                ],
            ],
            [
                'email' => 'byte@metube.com',
                'name' => 'The Daily Byte',
                'bio' => 'Tech news and honest gadget reviews, every day.',
                'tags' => ['tech', 'news', 'gadgets'],
                'titles' => [
                    'The future of AI in 2026',
                    'This laptop changed my workflow',
                    'Smartphone camera shootout',
                    'Why everyone is talking about RISC-V',
                    'Gadgets I cannot live without',
                    'The truth about fast charging',
                    'I tried the new foldables',
                    'Linux on a thin-and-light laptop',
                ],
            ],
            [
                'email' => 'lofi@metube.com',
                'name' => 'Lo-Fi Lab',
                'bio' => 'Beats to relax, study and code to.',
                'tags' => ['music', 'lofi', 'chill'],
                'titles' => [
                    'Late night coding beats',
                    'Rainy day study mix',
                    'Synthwave essentials',
                    'How lo-fi is made',
                    'Ambient sounds for focus',
                    'Jazzy hip-hop session',
                    'Morning coffee jazz',
                    'Deep work, one hour mix',
                ],
            ],
            [
                'email' => 'trail@metube.com',
                'name' => 'Trailhead',
                'bio' => 'Hiking, van life and slow travel off the beaten path.',
                'tags' => ['travel', 'outdoors', 'vlog'],
                'titles' => [
                    'Hiking the hidden trails',
                    '48 hours in the mountains',
                    'Van life on a budget',
                    'Packing the perfect backpack',
                    'Sunrise above the clouds',
                    'Coastal road trip diary',
                    'Solo camping essentials',
                    'The trail that almost beat me',
                ],
            ],
            [
                'email' => 'chef@metube.com',
                'name' => "Chef's Table 2.0",
                'bio' => 'Approachable recipes and kitchen fundamentals.',
                'tags' => ['cooking', 'food', 'recipe'],
                'titles' => [
                    'The perfect homemade pasta',
                    '5 weeknight dinners',
                    'Mastering the cast iron',
                    'Street food at home',
                    'Baking sourdough from scratch',
                    'Knife skills 101',
                    'One-pan dinners that slap',
                    'The only pancake recipe you need',
                ],
            ],
            [
                'email' => 'science@metube.com',
                'name' => 'Science Snack',
                'bio' => 'Big ideas in science, explained in small bites.',
                'tags' => ['science', 'education', 'space'],
                'titles' => [
                    'Why the sky is really blue',
                    'Black holes, simply explained',
                    'The physics of everyday life',
                    'How vaccines actually work',
                    'A trip through the solar system',
                    'Quantum computing for beginners',
                    'Why time feels faster as you age',
                    'The tiny ecosystem living on you',
                ],
            ],
            [
                'email' => 'fit@metube.com',
                'name' => 'Fit & Focused',
                'bio' => 'Evidence-based workouts and healthy habits.',
                'tags' => ['fitness', 'health', 'workout'],
                'titles' => [
                    '20-minute full body workout',
                    'Mobility routine for desk workers',
                    'The science of building muscle',
                    'Running form fundamentals',
                    'Meal prep for the week',
                    'Recovery you are probably skipping',
                    'Fix your posture in 10 minutes',
                    'Beginner strength, week one',
                ],
            ],
            [
                'email' => 'snap@metube.com',
                'name' => 'Frame & Focus',
                'bio' => 'Photography techniques, gear and editing walkthroughs.',
                'tags' => ['photography', 'camera', 'tutorial'],
                'titles' => [
                    'Master manual mode in one video',
                    'Golden hour portraits explained',
                    'Editing RAW for beginners',
                    'Cheap lenses that punch above their price',
                    'Composition rules worth breaking',
                    'Astrophotography from your backyard',
                    'Street photography confidence',
                    'Color grading like the pros',
                ],
            ],
            [
                'email' => 'money@metube.com',
                'name' => 'Coin & Compass',
                'bio' => 'Personal finance, investing and money mindset, jargon-free.',
                'tags' => ['finance', 'money', 'investing'],
                'titles' => [
                    'Budgeting that actually sticks',
                    'Index funds, simply explained',
                    'Build an emergency fund fast',
                    'The psychology of spending',
                    'Pay off debt the smart way',
                    'Retirement math for your twenties',
                    'Side income ideas that scale',
                    'Avoid these investing mistakes',
                ],
            ],
            [
                'email' => 'laugh@metube.com',
                'name' => 'Punchline Pictures',
                'bio' => 'Sketches, bits and behind-the-scenes comedy.',
                'tags' => ['comedy', 'sketch', 'entertainment'],
                'titles' => [
                    'When the wifi goes down',
                    'Every group project ever',
                    'Tech support nightmares',
                    'The meeting that should have been an email',
                    'Trying to be a morning person',
                    'How we write a sketch',
                    'Improv games you can play anywhere',
                    'Bloopers from last season',
                ],
            ],
            [
                'email' => 'build@metube.com',
                'name' => 'Makers Corner',
                'bio' => 'DIY builds, home projects and weekend crafts.',
                'tags' => ['diy', 'home', 'crafts'],
                'titles' => [
                    'Build a desk from scratch',
                    'Floating shelves in an afternoon',
                    'Restore an old chair',
                    'Tiny apartment storage hacks',
                    'Resin art for total beginners',
                    'Tool kit essentials under $100',
                    'Paint like a professional',
                    'Smart home on a budget',
                ],
            ],
        ];
    }
}
