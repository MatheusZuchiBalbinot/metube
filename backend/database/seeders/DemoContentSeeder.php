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
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Seeds a rich, demo-ready dataset: themed channels, ~115 videos that actually
 * play through real HLS packages (run through the same HlsTranscodeService
 * TranscodeVideoToHls uses in production — not just a raw file URL), on-topic
 * thumbnails/descriptions/summaries/transcripts/captions (not Lorem Ipsum),
 * shorts, comment threads with likes, reactions (including dislikes), pending
 * AI suggestions and notifications. Idempotent — safe to re-run via
 * `php artisan db:seed`.
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
     * On-topic content per channel category, keyed by the channel's primary tag.
     * Everything text-visible in the UI (description, AI summary, transcript,
     * thumbnail) is built from these instead of Faker's Lorem Ipsum, which reads
     * as garbage no matter the configured locale (Faker's paragraph()/sentence()
     * always emit pseudo-Latin — it doesn't follow app.faker_locale).
     *
     * @var array<string, array{color: array{string, string}, description: list<string>, keyPoints: list<string>, chapters: list<string>}>
     */
    private const CATEGORIES = [
        'programming' => [
            'color' => ['0f172a', '38bdf8'],
            'description' => [
                '"{title}" walks through the process step by step, with runnable code at every stage.',
                'Along the way we cover the trade-offs behind each decision, not just the syntax.',
                "By the end you'll have a working example you can adapt to your own project.",
            ],
            'keyPoints' => [
                'A clear, beginner-friendly walkthrough of the topic.',
                'Real code you can copy, run, and adapt immediately.',
                'The trade-offs behind each design decision, explained plainly.',
                'Common mistakes developers make here, and how to avoid them.',
            ],
            'chapters' => ['Introduction', 'Setting up the project', 'Core implementation', 'Handling edge cases', 'Testing it end to end', 'Wrap-up and next steps'],
        ],
        'gaming' => [
            'color' => ['1e1b4b', 'a78bfa'],
            'description' => [
                '"{title}" breaks down what makes this one worth your time — or not.',
                'Expect honest impressions and no spoilers in the first half.',
                'Stick around for the final verdict at the end.',
            ],
            'keyPoints' => [
                'An honest first-hand take, not a press-kit summary.',
                'Real gameplay footage from actual runs.',
                "What works, what doesn't, and who it's actually for.",
                'A clear final verdict with no fence-sitting.',
            ],
            'chapters' => ['Intro', 'First impressions', 'Gameplay deep dive', 'What could be better', 'Final verdict'],
        ],
        'tech' => [
            'color' => ['111827', '34d399'],
            'description' => [
                '"{title}" cuts through the marketing to tell you what actually changed.',
                'We put the claims to the test with real numbers, not press-release specs.',
                "If you're deciding whether this is worth it, this is the video for you.",
            ],
            'keyPoints' => [
                "What's genuinely new here, beyond the marketing.",
                'Real-world numbers, not press-release specs.',
                'Who this actually makes sense for.',
                'The catches nobody mentions in the keynote.',
            ],
            'chapters' => ['Intro', "What's new", 'Real-world testing', 'Comparison', 'Should you get it?'],
        ],
        'music' => [
            'color' => ['451a03', 'fbbf24'],
            'description' => [
                'A continuous mix built for "{title}" — no vocals, no sudden drops, just a steady groove.',
                'Perfect as background while you work, study, or wind down.',
            ],
            'keyPoints' => [
                'A steady, non-distracting mix built for focus.',
                'No vocals or sudden volume changes.',
                'Mixed for long, uninterrupted listening sessions.',
            ],
            'chapters' => ['Warm-up', 'Deep focus', 'Golden hour', 'Wind-down'],
        ],
        'travel' => [
            'color' => ['083344', '67e8f9'],
            'description' => [
                '"{title}" follows the whole trip — the good parts and the parts that went sideways.',
                'Real footage, real costs, and a few tips for anyone planning the same route.',
            ],
            'keyPoints' => [
                'The full route, day by day.',
                'What it actually cost — no vague numbers.',
                'The part that went wrong, and how it got fixed.',
                'Practical tips if you\'re planning something similar.',
            ],
            'chapters' => ['Setting off', 'The journey', 'A rough patch', 'The payoff', 'Would I do it again?'],
        ],
        'cooking' => [
            'color' => ['431407', 'fb923c'],
            'description' => [
                '"{title}" breaks the recipe into steps anyone can follow, no fancy equipment required.',
                'We cover the mistake that usually ruins this dish, and how to avoid it.',
            ],
            'keyPoints' => [
                'A foolproof, step-by-step method.',
                'The mistake most people make, and how to avoid it.',
                'Ingredient swaps if you\'re missing something.',
                "How to tell when it's actually done.",
            ],
            'chapters' => ['Ingredients', 'Prep', 'Cooking it', 'Plating', 'Taste test'],
        ],
        'science' => [
            'color' => ['1e3a8a', '93c5fd'],
            'description' => [
                '"{title}" explains the idea from first principles — no prior background needed.',
                'We lean on plain analogies instead of jargon wherever we can.',
            ],
            'keyPoints' => [
                'The core idea, explained from scratch.',
                'Plain-language analogies instead of jargon.',
                'Why this actually matters outside the lab.',
                'The most common misconception, cleared up.',
            ],
            'chapters' => ['The question', 'Building intuition', 'The core idea', 'Why it matters', 'Recap'],
        ],
        'fitness' => [
            'color' => ['052e16', '4ade80'],
            'description' => [
                '"{title}" is built around form first, so you get results without the injuries.',
                'No equipment assumptions — options are given for home and gym.',
            ],
            'keyPoints' => [
                'Form cues that actually prevent injury.',
                'Options for both home and gym setups.',
                'What to expect in the first few weeks.',
                'How to progress once this gets easy.',
            ],
            'chapters' => ['Warm-up', 'Form breakdown', 'The workout', 'Cooldown', 'Progression tips'],
        ],
        'photography' => [
            'color' => ['27272a', 'e4e4e7'],
            'description' => [
                '"{title}" covers the technique with real shots, straight out of camera and after editing.',
                'No expensive gear required — the principle matters more than the equipment.',
            ],
            'keyPoints' => [
                'The technique, shown on real shots.',
                'Before-and-after comparisons, not just theory.',
                "Gear that actually matters here — and what doesn't.",
                'A common mistake that ruins the shot.',
            ],
            'chapters' => ["The shot we're after", 'Camera settings', 'Taking the shot', 'Editing pass', 'Before vs after'],
        ],
        'finance' => [
            'color' => ['064e3b', '6ee7b7'],
            'description' => [
                '"{title}" breaks this down in plain language, with nothing to sell you.',
                'We use real numbers and realistic timelines, not best-case scenarios.',
            ],
            'keyPoints' => [
                'A jargon-free explanation of the topic.',
                'Real numbers, not best-case projections.',
                'The most common mistake people make here.',
                'A realistic timeline for seeing results.',
            ],
            'chapters' => ['The problem', 'The concept', 'Doing the math', 'Common pitfalls', 'Putting it into practice'],
        ],
        'comedy' => [
            'color' => ['581c87', 'e9d5ff'],
            'description' => [
                '"{title}" is exactly what it sounds like — and it gets worse from there, in a good way.',
                'Full bloopers and behind-the-scenes chaos included at the end.',
            ],
            'keyPoints' => [
                'The premise escalates fast — stick with it.',
                'Real reactions, not scripted ones.',
                'Bloopers included at the end.',
            ],
            'chapters' => ['Setup', 'It escalates', 'The turn', 'Payoff', 'Bloopers'],
        ],
        'diy' => [
            'color' => ['422006', 'fde047'],
            'description' => [
                '"{title}" is broken into steps you can actually follow, weekend by weekend if needed.',
                'A rough materials list and cost estimate are covered up front.',
            ],
            'keyPoints' => [
                'A realistic materials list and cost estimate.',
                'Step-by-step instructions, no assumed experience.',
                'The mistake that costs the most time to fix.',
                'How to adapt this if your space is different.',
            ],
            'chapters' => ['Planning', 'Materials', 'Building it', 'Fixing a mistake', 'The finished result'],
        ],
        'meta' => [
            'color' => ['18181b', 'f4f4f5'],
            'description' => [
                '"{title}" — a quick update straight from the team building MeTube.',
            ],
            'keyPoints' => [
                "What's changing and why.",
                'What to expect next.',
            ],
            'chapters' => ['Intro', 'The update', "What's next"],
        ],
    ];

    /** @var list<string> */
    private const COMMENT_TEMPLATES = [
        'Great video, this helped a lot!',
        'Underrated channel, instant subscribe.',
        'Loved the editing and pacing.',
        'Came here from the recommendations and stayed.',
        'Please make a part 2 of this.',
        'Watched this three times already.',
        'The pacing in the middle section was perfect.',
        'This is exactly what I needed today, thank you.',
        'Good content, but the audio could be a bit louder.',
        'Been waiting for someone to cover this properly.',
        'Saved this one for later, definitely rewatching.',
        'Solid video overall, subscribed!',
        "Didn't expect to watch the whole thing but here we are.",
        'The quality of your content keeps getting better.',
        'This deserves way more views.',
        'Sharing this with everyone I know.',
    ];

    /** @var list<string> */
    private const REPLY_TEMPLATES = [
        'Thanks for watching — glad it helped!',
        'Appreciate the kind words, more coming soon.',
        'Noted, working on the audio levels for the next one!',
        'Glad you stuck around till the end 🙌',
    ];

    /** Running index used to cycle the video pool, spread publish dates, and pick deterministic variety. */
    private int $cursor = 0;

    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@metube.com'],
            ['name' => 'Admin', 'password' => 'password'],
        );

        $hlsPool = $this->provisionHlsPackages();

        $channels = $this->seedChannels();
        $videos = $this->seedVideos($channels, $hlsPool);
        $this->seedAdminVideos($admin, $hlsPool);

        $categoryByChannelId = $channels->mapWithKeys(
            fn (array $c): array => [$c['user']->id => $c['tags'][0]],
        );
        $categoryByChannelId->put($admin->id, 'meta');

        $published = Video::whereIn('channel_id', [...$channels->pluck('user.id'), $admin->id])
            ->where('status', VideoStatus::PUBLISHED)
            ->get();

        $this->seedAiLayer($published, $categoryByChannelId);
        $this->seedEngagement($admin, $channels, $published);
        $this->seedAiSuggestions($admin);
        $this->seedNotifications($admin, $channels->map(fn (array $c) => $c['user']));

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
        return collect($this->channelDefinitions())->map(function (array $def): array {
            $user = User::firstOrCreate(
                ['email' => $def['email']],
                [
                    'name' => $def['name'],
                    'password' => 'password',
                    'bio' => $def['bio'],
                    'avatar' => 'https://i.pravatar.cc/300?u=' . urlencode($def['email']),
                ],
            );

            return ['user' => $user, 'tags' => $def['tags'], 'titles' => $def['titles']];
        });
    }

    /**
     * Create the published catalogue (regular videos + one short per channel),
     * cycling real HLS packages from the provisioned pool.
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
                $source = $hlsPool['long'][$this->cursor % count($hlsPool['long'])];
                $videos->push($this->makeVideo($channel['user'], $title, $channel['tags'], $category, [
                    'hls_url' => $source['hlsUrl'],
                    'duration' => $source['duration'],
                ]));
            }

            $shortTitle = ucfirst($category) . ' in 60 seconds';
            $source = $hlsPool['short'][$this->cursor % count($hlsPool['short'])];
            $videos->push($this->makeVideo($channel['user'], $shortTitle, [...$channel['tags'], 'shorts'], $category, [
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
     */
    private function seedAdminVideos(User $admin, array $hlsPool): void
    {
        $first = $hlsPool['long'][0];
        $second = $hlsPool['long'][1 % count($hlsPool['long'])];

        $this->makeVideo($admin, 'Welcome to MeTube', ['meta', 'announcement'], 'meta', [
            'hls_url' => $first['hlsUrl'],
            'duration' => $first['duration'],
        ]);
        $this->makeVideo($admin, 'Behind the scenes of the platform', ['meta', 'devlog'], 'meta', [
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
        [$bg, $fg] = self::CATEGORIES[$category]['color'];

        return Video::updateOrCreate(
            ['channel_id' => $channel->id, 'title' => $title],
            array_merge([
                'description' => $this->buildDescription($category, $title),
                'tags' => $tags,
                'status' => VideoStatus::PUBLISHED,
                'duration' => fake()->numberBetween(240, 1800),
                'views' => fake()->numberBetween(800, 250_000),
                'video_url' => null,
                'hls_url' => null,
                'thumbnail_url' => sprintf(
                    'https://placehold.co/640x360/%s/%s?font=roboto&text=%s',
                    $bg,
                    $fg,
                    rawurlencode($title),
                ),
                'published_at' => now()->subDays($index * 4 + fake()->numberBetween(0, 3)),
                'scheduled_at' => null,
            ], $overrides),
        );
    }

    /**
     * Two sentences of the category's description bank, with the title interpolated.
     */
    private function buildDescription(string $category, string $title): string
    {
        $sentences = self::CATEGORIES[$category]['description'];
        $picked = array_slice($sentences, 0, 2);

        return implode(' ', array_map(
            fn (string $s): string => str_replace('{title}', $title, $s),
            $picked,
        ));
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
            $bank = self::CATEGORIES[$category];
            $duration = $video->duration ?? 300.0;

            VideoSummary::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'key_points' => $bank['keyPoints'],
                    'chapters' => $this->buildChapters($bank['chapters'], $duration),
                    'reading_mode' => $this->buildReadingMode($category, $video->title),
                ],
            );

            $transcriptSentences = $this->buildTranscriptSentences($category, $video->title);

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
     * Distributes chapter titles evenly across the video's actual duration instead
     * of using the same fixed timestamps regardless of length.
     *
     * @param list<string> $titles
     *
     * @return list<array{timestamp: string, title: string}>
     */
    private function buildChapters(array $titles, float $duration): array
    {
        $count = count($titles);

        return array_map(
            fn (int $i, string $title): array => [
                'timestamp' => $this->formatTimestamp((int) floor($duration * $i / $count)),
                'title' => $title,
            ],
            array_keys($titles),
            $titles,
        );
    }

    private function formatTimestamp(int $seconds): string
    {
        $hours = intdiv($seconds, 3600);
        $minutes = intdiv($seconds % 3600, 60);
        $secs = $seconds % 60;

        return $hours > 0
            ? sprintf('%d:%02d:%02d', $hours, $minutes, $secs)
            : sprintf('%d:%02d', $minutes, $secs);
    }

    private function buildReadingMode(string $category, string $title): string
    {
        $bank = self::CATEGORIES[$category];
        $lastSentence = end($bank['description']);
        $intro = str_replace('{title}', $title, $lastSentence);
        $summary = implode(' ', $bank['keyPoints']);

        return "{$intro} {$summary}";
    }

    /**
     * @return list<string>
     */
    private function buildTranscriptSentences(string $category, string $title): array
    {
        $bank = self::CATEGORIES[$category];
        $opening = str_replace('{title}', $title, $bank['description'][0]);

        return [
            $opening,
            ...$bank['keyPoints'],
            'Thanks for watching — see you in the next one.',
        ];
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
     */
    private function seedEngagement(User $admin, Collection $channels, Collection $published): void
    {
        $channelUsers = $channels->map(fn (array $c) => $c['user']);

        $this->seedSubscriptions($admin, $channelUsers);
        $this->seedReactions($admin, $channelUsers, $published);
        $this->seedHistory($admin, $published);
        $this->seedPlaylists($admin, $published);
        $this->seedComments($admin, $channelUsers, $published);
    }

    /**
     * @param Collection<int, User> $channelUsers
     */
    private function seedSubscriptions(User $admin, Collection $channelUsers): void
    {
        $admin->subscriptions()->syncWithoutDetaching($channelUsers->take(4)->pluck('id')->all());

        foreach ($channelUsers as $user) {
            $others = $channelUsers->where('id', '!=', $user->id);
            $picks = $others->count() > 0 ? $others->random(min(2, $others->count())) : collect();
            $user->subscriptions()->syncWithoutDetaching(collect($picks)->pluck('id')->all());
        }
    }

    /**
     * @param Collection<int, User> $channelUsers
     * @param Collection<int, Video> $published
     */
    private function seedReactions(User $admin, Collection $channelUsers, Collection $published): void
    {
        $likable = $published->random(min(10, $published->count()));

        foreach ($likable as $video) {
            $admin->reactions()->syncWithoutDetaching([$video->id => ['type' => ReactionType::LIKE->value]]);
        }

        // A handful of videos get an honest dislike too — an all-likes demo dataset
        // doesn't reflect what a real reactions table looks like.
        $dislikable = $published->whereNotIn('id', $likable->pluck('id'))->random(min(4, max($published->count() - $likable->count(), 0)));

        foreach ($dislikable as $video) {
            $admin->reactions()->syncWithoutDetaching([$video->id => ['type' => ReactionType::DISLIKE->value]]);
        }

        foreach ($channelUsers as $user) {
            $likeable = $published->where('channel_id', '!=', $user->id);

            if ($likeable->isEmpty()) {
                continue;
            }

            foreach ($likeable->random(min(5, $likeable->count())) as $video) {
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

        foreach ($published->random(min(12, $published->count())) as $video) {
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
        $this->fillPlaylist($watchLater, $published->random(min(5, $published->count())));

        $favorites = $admin->playlists()->firstOrCreate(['name' => 'Favorites']);
        $this->fillPlaylist($favorites, $published->random(min(6, $published->count())));
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
     * like counts aren't all zero.
     *
     * @param Collection<int, User> $channelUsers
     * @param Collection<int, Video> $published
     */
    private function seedComments(User $admin, Collection $channelUsers, Collection $published): void
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

            $commentCount = 2 + ($index % 4);
            $picked = $commenters->count() >= $commentCount
                ? $commenters->random($commentCount)
                : $commenters;

            $threadStarter = null;

            foreach (collect($picked)->values() as $i => $author) {
                $comment = Comment::create([
                    'user_id' => $author->id,
                    'video_id' => $video->id,
                    'parent_id' => null,
                    'content' => self::COMMENT_TEMPLATES[($index + $i) % count(self::COMMENT_TEMPLATES)],
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

        foreach ($candidates as $video) {
            VideoAiSuggestion::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'suggested_title' => $video->title . ' — Full Walkthrough',
                    'suggested_description' => $this->buildDescription('meta', $video->title),
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
     *
     * @param Collection<int, User> $channelUsers
     */
    private function seedNotifications(User $admin, Collection $channelUsers): void
    {
        if ($admin->notifications()->exists()) {
            return;
        }

        $firstChannel = $channelUsers->first() ?? $admin;
        $secondChannel = $channelUsers->get(1) ?? $firstChannel;

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
                    'vuid' => 'demo',
                    'video_title' => 'Welcome to MeTube',
                    'thumbnail_url' => null,
                ],
                'age' => now()->subHours(5),
                'read' => false,
            ],
            [
                'type' => NotificationType::COMMENT_REPLIED,
                'data' => [
                    'type' => NotificationType::COMMENT_REPLIED->value,
                    'replier_name' => $firstChannel->name,
                    'cuid' => 'demo',
                    'vuid' => 'demo',
                ],
                'age' => now()->subDay(),
                'read' => true,
            ],
            [
                'type' => NotificationType::VIDEO_AI_SUMMARY_READY,
                'data' => [
                    'type' => NotificationType::VIDEO_AI_SUMMARY_READY->value,
                    'vuid' => 'demo',
                    'video_title' => 'Behind the scenes of the platform',
                    'thumbnail_url' => null,
                ],
                'age' => now()->subDays(2),
                'read' => true,
            ],
        ];

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
