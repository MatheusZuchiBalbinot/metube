<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\ReactionType;
use App\Enums\TranscriptionStatus;
use App\Enums\VideoStatus;
use App\Models\Comment;
use App\Models\Playlist;
use App\Models\Transcription;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoProgress;
use App\Models\VideoSummary;
use App\Models\WatchHistory;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Seeds a rich, demo-ready dataset: themed channels, ~50 playable videos (real
 * sample streams + thumbnails), shorts, AI summaries/transcriptions and engagement
 * (subscriptions, likes, watch history, comments, playlists). Idempotent — safe to
 * re-run via `php artisan db:seed`.
 */
class DemoContentSeeder extends Seeder
{
    /**
     * Publicly-hosted sample videos that actually stream in the browser.
     *
     * @var list<string>
     */
    private const VIDEO_POOL = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
    ];

    /** Running index used to cycle the video pool and spread publish dates. */
    private int $cursor = 0;

    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@metube.com'],
            ['name' => 'Admin', 'password' => 'password'],
        );

        $channels = $this->seedChannels();
        $videos = $this->seedVideos($channels);
        $this->seedAdminVideos($admin);

        $published = $videos->filter(fn (Video $v) => $v->status === VideoStatus::PUBLISHED)->values();

        $this->seedAiLayer($published);
        $this->seedEngagement($admin, $channels, $published);
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
     * Create the published catalogue (regular videos + one short per channel).
     *
     * @param Collection<int, array{user: User, tags: list<string>, titles: list<string>}> $channels
     *
     * @return Collection<int, Video>
     */
    private function seedVideos(Collection $channels): Collection
    {
        $videos = collect();

        foreach ($channels as $channel) {
            foreach ($channel['titles'] as $title) {
                $videos->push($this->makeVideo($channel['user'], $title, $channel['tags']));
            }

            $shortTitle = $channel['tags'][0] . ' in 60 seconds';
            $videos->push($this->makeVideo($channel['user'], $shortTitle, [...$channel['tags'], 'shorts'], [
                'duration' => fake()->numberBetween(20, 75),
            ]));
        }

        return $videos;
    }

    /**
     * Give the admin a couple of published videos plus one of each non-published
     * status, so every state is visible on their profile during local testing.
     */
    private function seedAdminVideos(User $admin): void
    {
        $this->makeVideo($admin, 'Welcome to MeTube', ['meta', 'announcement']);
        $this->makeVideo($admin, 'Behind the scenes of the platform', ['meta', 'devlog']);

        $this->makeVideo($admin, 'Upcoming: roadmap reveal', ['meta'], [
            'status' => VideoStatus::SCHEDULED,
            'scheduled_at' => now()->addDays(3),
            'published_at' => null,
        ]);
        $this->makeVideo($admin, 'Draft: editing in progress', ['meta'], [
            'status' => VideoStatus::DRAFT,
            'published_at' => null,
        ]);
        $this->makeVideo($admin, 'Processing demo upload', ['meta'], [
            'status' => VideoStatus::PROCESSING,
            'published_at' => null,
        ]);
    }

    /**
     * Create (or refresh) a single video, cycling the sample pool and spreading dates.
     *
     * @param list<string> $tags
     * @param array<string, mixed> $overrides
     */
    private function makeVideo(User $channel, string $title, array $tags, array $overrides = []): Video
    {
        $index = $this->cursor++;
        $slug = Str::slug($title);

        return Video::updateOrCreate(
            ['channel_id' => $channel->id, 'title' => $title],
            array_merge([
                'description' => fake()->paragraphs(2, true),
                'tags' => $tags,
                'status' => VideoStatus::PUBLISHED,
                'duration' => fake()->numberBetween(240, 1800),
                'views' => fake()->numberBetween(800, 250_000),
                'video_url' => self::VIDEO_POOL[$index % count(self::VIDEO_POOL)],
                'thumbnail_url' => "https://picsum.photos/seed/{$slug}/640/360",
                'published_at' => now()->subDays($index * 4 + fake()->numberBetween(0, 3)),
                'scheduled_at' => null,
            ], $overrides),
        );
    }

    /**
     * Attach AI summaries and completed transcriptions to the most popular videos,
     * so the watch page shows chapters, key points and a transcript.
     *
     * @param Collection<int, Video> $published
     */
    private function seedAiLayer(Collection $published): void
    {
        foreach ($published->sortByDesc('views')->take(10) as $video) {
            VideoSummary::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'key_points' => [
                        'A clear, beginner-friendly walkthrough of the topic.',
                        'Practical examples you can follow along with.',
                        'Common pitfalls and how to avoid them.',
                    ],
                    'chapters' => [
                        ['timestamp' => '0:00', 'title' => 'Introduction'],
                        ['timestamp' => '1:30', 'title' => 'Core concepts'],
                        ['timestamp' => '4:15', 'title' => 'Hands-on example'],
                        ['timestamp' => '8:40', 'title' => 'Wrap-up'],
                    ],
                    'reading_mode' => fake()->paragraphs(3, true),
                ],
            );

            Transcription::updateOrCreate(
                ['video_id' => $video->id],
                [
                    'language' => 'en',
                    'content' => fake()->paragraphs(6, true),
                    'status' => TranscriptionStatus::COMPLETED,
                    'started_at' => now()->subDays(1),
                ],
            );
        }
    }

    /**
     * Wire up subscriptions, reactions, watch history/progress, comments and playlists
     * so the home feed, recommendations and library views are populated.
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
        foreach ($published->random(min(10, $published->count())) as $video) {
            $admin->reactions()->syncWithoutDetaching([$video->id => ['type' => ReactionType::LIKE->value]]);
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
     * @param Collection<int, User> $channelUsers
     * @param Collection<int, Video> $published
     */
    private function seedComments(User $admin, Collection $channelUsers, Collection $published): void
    {
        $authors = $channelUsers->push($admin);
        $samples = [
            'Great video, this helped a lot!',
            'Underrated channel, instant subscribe.',
            'Loved the editing and pacing.',
            'Came here from the recommendations and stayed.',
            'Please make a part 2 of this.',
        ];

        foreach ($published->sortByDesc('views')->take(6) as $video) {
            if (Comment::where('video_id', $video->id)->exists()) {
                continue;
            }

            $commenters = $authors->where('id', '!=', $video->channel_id);

            if ($commenters->isEmpty()) {
                continue;
            }

            $picked = $commenters->random(min(3, $commenters->count()));
            $parent = null;

            foreach (collect($picked)->values() as $i => $author) {
                $comment = Comment::create([
                    'user_id' => $author->id,
                    'video_id' => $video->id,
                    'parent_id' => null,
                    'content' => $samples[$i % count($samples)],
                ]);
                $video->increment('comments_count');
                $parent ??= $comment;
            }

            if ($parent !== null) {
                Comment::create([
                    'user_id' => $video->channel_id,
                    'video_id' => $video->id,
                    'parent_id' => $parent->id,
                    'content' => 'Thanks for watching — glad it helped!',
                ]);
                $parent->increment('replies_count');
                $video->increment('comments_count');
            }
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
