<?php

declare(strict_types=1);

namespace Database\Seeders\Support;

use InvalidArgumentException;

/**
 * Static registry of every demo category's content bank. Each bank is
 * intentionally larger than what a single video needs — DemoContentGenerator
 * draws a different seeded slice per video, so two videos in the same
 * category read as genuinely different pieces of content instead of the same
 * paragraph with the title swapped in.
 */
final class DemoCategoryCatalog
{
    /** @var array<string, DemoCategoryBank>|null */
    private static ?array $banks = null;

    public static function get(string $category): DemoCategoryBank
    {
        $banks = self::all();

        if (!isset($banks[$category])) {
            throw new InvalidArgumentException("No demo category bank registered for '{$category}'.");
        }

        return $banks[$category];
    }

    public static function has(string $category): bool
    {
        return isset(self::all()[$category]);
    }

    /**
     * @return array<string, DemoCategoryBank>
     */
    public static function all(): array
    {
        return self::$banks ??= [
            'programming' => new DemoCategoryBank(
                color: ['0f172a', '38bdf8'],
                icon: '</>',
                descriptions: [
                    '"{title}" walks through the process step by step, with runnable code at every stage.',
                    'Along the way we cover the trade-offs behind each decision, not just the syntax.',
                    "By the end you'll have a working example you can adapt to your own project.",
                    "This isn't a slide-deck tutorial — every claim is backed by code you can actually run.",
                    'We start from a blank project and build up, so nothing is assumed except the basics.',
                    'Expect a few detours into "why" a pattern exists, not just "how" to type it out.',
                ],
                keyPoints: [
                    'A clear, beginner-friendly walkthrough of the topic.',
                    'Real code you can copy, run, and adapt immediately.',
                    'The trade-offs behind each design decision, explained plainly.',
                    'Common mistakes developers make here, and how to avoid them.',
                    'A quick look at how this scales once a project grows past a toy example.',
                    'Links and references for going deeper after the video.',
                ],
                chapters: ['Introduction', 'Setting up the project', 'Core implementation', 'Handling edge cases', 'Testing it end to end', 'Wrap-up and next steps'],
                comments: [
                    'Finally a video that actually shows the code instead of just slides.',
                    'The part about edge cases saved me from a bug I had for weeks.',
                    'Clean explanation, no unnecessary fluff. Subscribed.',
                    'Could you do a follow-up on testing this in CI?',
                    'This is way better than the official docs, honestly.',
                    'I paused so many times to actually type this out myself — worth it.',
                    'The trade-offs section is what sets this apart from other tutorials.',
                    'Been stuck on this exact problem at work, perfect timing.',
                    'Your pacing is great, not too fast and not padded with filler.',
                    'More videos like this please, this is exactly my level.',
                ],
                closingLines: [
                    "That's the core implementation — try adapting it to your own project and let me know how it goes.",
                    "If you got stuck anywhere, drop a comment with the error and I'll try to help.",
                    'Source code for this video is linked in the description.',
                ],
            ),
            'gaming' => new DemoCategoryBank(
                color: ['1e1b4b', 'a78bfa'],
                icon: '▶',
                descriptions: [
                    '"{title}" breaks down what makes this one worth your time — or not.',
                    'Expect honest impressions and no spoilers in the first half.',
                    'Stick around for the final verdict at the end.',
                    'Footage is from real playthroughs, not marketing trailers.',
                    "We're not sponsored by the publisher, so this is our honest take.",
                    'Grab a controller — some of this is easier to follow with the mechanics fresh in mind.',
                ],
                keyPoints: [
                    'An honest first-hand take, not a press-kit summary.',
                    'Real gameplay footage from actual runs.',
                    "What works, what doesn't, and who it's actually for.",
                    'A clear final verdict with no fence-sitting.',
                    'A quick note on performance and any bugs we ran into.',
                    'How it compares to the closest thing in its genre.',
                ],
                chapters: ['Intro', 'First impressions', 'Gameplay deep dive', 'What could be better', 'Performance notes', 'Final verdict'],
                comments: [
                    'Underrated channel, instant subscribe.',
                    'Been waiting for someone to cover this without a sponsorship deal.',
                    'The gameplay deep dive answered every question I had before buying.',
                    'Finally someone mentions the performance issues instead of ignoring them.',
                    "Your verdict matches my experience exactly, glad it's not just me.",
                    'This convinced me to wait for a sale instead of buying day one.',
                    'More honest reviews like this, please.',
                    'The comparison section was super helpful, thank you.',
                    'Watched this three times already deciding whether to buy.',
                    'Real gameplay footage instead of a trailer — respect.',
                ],
                closingLines: [
                    "That's the verdict — let me know in the comments if you've played it and agree.",
                    "If there's another one you want covered next, drop it below.",
                    'Full timestamps for each section are in the description.',
                ],
            ),
            'tech' => new DemoCategoryBank(
                color: ['111827', '34d399'],
                icon: '◍',
                descriptions: [
                    '"{title}" cuts through the marketing to tell you what actually changed.',
                    'We put the claims to the test with real numbers, not press-release specs.',
                    "If you're deciding whether this is worth it, this is the video for you.",
                    'No affiliate links pushing you one way or another here.',
                    'Testing was done over two weeks of daily use, not a five-minute demo unit.',
                    "We'll flag anything that feels like a downgrade too, not just the wins.",
                ],
                keyPoints: [
                    "What's genuinely new here, beyond the marketing.",
                    'Real-world numbers, not press-release specs.',
                    'Who this actually makes sense for.',
                    'The catches nobody mentions in the keynote.',
                    'How it stacks up against last year\'s model.',
                    'Whether it\'s worth upgrading for, or waiting another cycle.',
                ],
                chapters: ['Intro', "What's new", 'Real-world testing', 'Comparison', 'The catches', 'Should you get it?'],
                comments: [
                    'The real numbers section is why I trust this channel over the big outlets.',
                    'Thank you for actually testing this for two weeks instead of a quick demo.',
                    'The catches section saved me from an impulse buy, appreciate it.',
                    'This is the review I needed before deciding.',
                    'Good content, but the audio could be a bit louder.',
                    'Comparison to last year\'s model was exactly what I was looking for.',
                    'No sponsor plug for once, refreshing.',
                    'This deserves way more views than it has.',
                    'Sharing this with everyone I know who was asking about this.',
                    'The quality of your content keeps getting better every video.',
                ],
                closingLines: [
                    "That's the verdict — worth it if it fits the use case above, skip it otherwise.",
                    "Let me know what you'd want tested next.",
                    'Full spec sheet and sources are linked below.',
                ],
            ),
            'music' => new DemoCategoryBank(
                color: ['451a03', 'fbbf24'],
                icon: '♪',
                descriptions: [
                    'A continuous mix built for "{title}" — no vocals, no sudden drops, just a steady groove.',
                    'Perfect as background while you work, study, or wind down.',
                    'Mixed and mastered in-house, loop-friendly from start to end.',
                    'No copyright strikes here — every track is cleared for streaming alongside.',
                    'Volume is kept level throughout, so it never jars you out of focus.',
                    'A little different from the last mix, but built with the same intention: stay in the background.',
                ],
                keyPoints: [
                    'A steady, non-distracting mix built for focus.',
                    'No vocals or sudden volume changes.',
                    'Mixed for long, uninterrupted listening sessions.',
                    'Cleared for streaming and background use.',
                    'A tracklist is included in the description if you want individual songs.',
                    'Loops cleanly if you want to leave it running longer than the runtime.',
                ],
                chapters: ['Warm-up', 'Deep focus', 'Golden hour', 'Wind-down', 'Outro'],
                comments: [
                    'Loved the editing and pacing on the transitions between tracks.',
                    'This is now my go-to background music for work, thank you.',
                    'No sudden volume spikes, finally a mix I can trust while coding.',
                    'The tracklist in the description is such a nice touch.',
                    'Put this on loop for a 6-hour study session, held up the whole way.',
                    'Perfect as background while you work, exactly as advertised.',
                    'This deserves way more views than it has.',
                    'Saved this one for later, definitely rewatching — I mean relistening.',
                    'The golden hour section is my favorite part of the mix.',
                    'Sharing this with everyone I know who works from home.',
                ],
                closingLines: [
                    'Thanks for listening — the full tracklist is in the description.',
                    'If you want a longer version of this mix, let me know in the comments.',
                    'New mix drops next week, same time.',
                ],
            ),
            'travel' => new DemoCategoryBank(
                color: ['083344', '67e8f9'],
                icon: '✈',
                descriptions: [
                    '"{title}" follows the whole trip — the good parts and the parts that went sideways.',
                    'Real footage, real costs, and a few tips for anyone planning the same route.',
                    'No sponsorship from the places shown here, just an honest trip log.',
                    'Budget breakdown is included near the end for anyone planning something similar.',
                    'Shot entirely on a phone and a small action camera, nothing fancy.',
                    'Weather and timing notes are included in case you want to plan around them.',
                ],
                keyPoints: [
                    'The full route, day by day.',
                    'What it actually cost — no vague numbers.',
                    'The part that went wrong, and how it got fixed.',
                    "Practical tips if you're planning something similar.",
                    'Best time of year to go, based on this trip.',
                    'What we\'d do differently next time.',
                ],
                chapters: ['Setting off', 'The journey', 'A rough patch', 'The payoff', 'Budget breakdown', 'Would I do it again?'],
                comments: [
                    'Came here from the recommendations and stayed for the honest budget breakdown.',
                    'The part where it went wrong and you actually showed it, respect.',
                    'This makes me want to book a flight right now.',
                    'Real costs instead of "it depends" — thank you.',
                    'The rough patch section is what makes travel videos actually useful.',
                    'Saved this for my own trip planning next year.',
                    'Shot on a phone and still looks incredible, great editing.',
                    'This deserves way more views than it has.',
                    'Practical tips section was exactly what I needed before booking.',
                    'Sharing this with my travel group chat right now.',
                ],
                closingLines: [
                    "That's the trip — full budget breakdown is in the description if you're planning your own.",
                    'Let me know in the comments if you want the packing list too.',
                    'Next trip is already being planned, stay tuned.',
                ],
            ),
            'cooking' => new DemoCategoryBank(
                color: ['431407', 'fb923c'],
                icon: '◐',
                descriptions: [
                    '"{title}" breaks the recipe into steps anyone can follow, no fancy equipment required.',
                    'We cover the mistake that usually ruins this dish, and how to avoid it.',
                    'Ingredient list and exact measurements are in the description.',
                    'Tested this recipe five times before filming to get the timing right.',
                    'No professional kitchen here — everything shown works in a small home kitchen.',
                    'Swaps for common allergies or missing ingredients are covered near the end.',
                ],
                keyPoints: [
                    'A foolproof, step-by-step method.',
                    'The mistake most people make, and how to avoid it.',
                    "Ingredient swaps if you're missing something.",
                    "How to tell when it's actually done.",
                    'Storage tips if you want to make it ahead of time.',
                    'A serving suggestion to round out the meal.',
                ],
                chapters: ['Ingredients', 'Prep', 'Cooking it', 'The common mistake', 'Plating', 'Taste test'],
                comments: [
                    'Made this last night and it actually turned out right on the first try.',
                    'The mistake you pointed out is exactly what I was doing wrong for years.',
                    'Ingredient swaps section is so helpful for allergies in my house.',
                    'This is exactly what I needed today, thank you.',
                    'Good content, the pacing on the prep section is perfect for following along.',
                    'Saved this one for later, definitely making it this weekend.',
                    'Tested five times before filming really shows in how clean the steps are.',
                    'This deserves way more views than it has.',
                    'The storage tips at the end are such a nice bonus.',
                    'Sharing this with my family group chat immediately.',
                ],
                closingLines: [
                    "That's the dish — let me know in the comments how yours turns out.",
                    'Full ingredient list and measurements are in the description.',
                    'Next recipe is a reader request, coming soon.',
                ],
            ),
            'science' => new DemoCategoryBank(
                color: ['1e3a8a', '93c5fd'],
                icon: '⚛',
                descriptions: [
                    '"{title}" explains the idea from first principles — no prior background needed.',
                    'We lean on plain analogies instead of jargon wherever we can.',
                    'Sources and further reading are linked in the description for anyone who wants to go deeper.',
                    'This took a fair bit of research to simplify without getting it wrong — corrections welcome.',
                    'No math beyond what you had in school, promise.',
                    'A common misconception about this topic gets addressed near the end.',
                ],
                keyPoints: [
                    'The core idea, explained from scratch.',
                    'Plain-language analogies instead of jargon.',
                    'Why this actually matters outside the lab.',
                    'The most common misconception, cleared up.',
                    'A real-world example that makes the idea concrete.',
                    'Where to read more if this only scratched the surface.',
                ],
                chapters: ['The question', 'Building intuition', 'The core idea', 'A real example', 'Common misconception', 'Recap'],
                comments: [
                    'Never understood this until this video, thank you.',
                    'The analogy in the middle finally made it click for me.',
                    'This is exactly what I needed today, thank you.',
                    'The common misconception section cleared up something I got wrong for years.',
                    'No unnecessary jargon, exactly what a beginner-friendly explanation should be.',
                    'This deserves way more views than it has.',
                    'Sharing this with my science teacher, they need to see this.',
                    'The real-world example made this so much easier to follow.',
                    'Sources in the description are a nice touch for going deeper.',
                    'Solid video overall, subscribed for more like this.',
                ],
                closingLines: [
                    "That's the core idea — sources for going deeper are in the description.",
                    'If something was unclear, tell me exactly where and I\'ll cover it next.',
                    'More of these are planned, let me know what topic is next.',
                ],
            ),
            'fitness' => new DemoCategoryBank(
                color: ['052e16', '4ade80'],
                icon: '↯',
                descriptions: [
                    '"{title}" is built around form first, so you get results without the injuries.',
                    'No equipment assumptions — options are given for home and gym.',
                    'Not medical advice — check with a professional if you have an existing injury.',
                    'Every exercise here has a slower-paced demo cut in first, then the full-speed version.',
                    'Built for consistency over intensity — this is meant to be repeatable, not brutal.',
                    'A rough calorie/effort estimate is given at the end for reference.',
                ],
                keyPoints: [
                    'Form cues that actually prevent injury.',
                    'Options for both home and gym setups.',
                    'What to expect in the first few weeks.',
                    'How to progress once this gets easy.',
                    'Common form mistakes to watch for in the mirror.',
                    'A rough time and effort estimate before you start.',
                ],
                chapters: ['Warm-up', 'Form breakdown', 'The workout', 'Common mistakes', 'Cooldown', 'Progression tips'],
                comments: [
                    'The form breakdown alone is worth the watch, saved my lower back.',
                    'Finally a workout video that gives home AND gym options.',
                    'This is exactly what I needed today, thank you.',
                    'Good content, but the audio could be a bit louder during the workout section.',
                    'The progression tips at the end are what most channels skip entirely.',
                    'Did this for the first time today, felt every muscle mentioned.',
                    'This deserves way more views than it has.',
                    'Common mistakes section called me out specifically, needed that.',
                    'Solid video overall, subscribed for the progression series.',
                    'Sharing this with my gym group chat right now.',
                ],
                closingLines: [
                    "That's the full routine — form always comes before adding weight or reps.",
                    'Let me know in the comments how the first attempt goes.',
                    'Progression version of this drops in a couple weeks.',
                ],
            ),
            'photography' => new DemoCategoryBank(
                color: ['27272a', 'e4e4e7'],
                icon: '◎',
                descriptions: [
                    '"{title}" covers the technique with real shots, straight out of camera and after editing.',
                    'No expensive gear required — the principle matters more than the equipment.',
                    'Every shot shown was taken with gear listed in the description, nothing borrowed for the video.',
                    'Settings used for each shot are shown on screen as we go.',
                    'This works with a phone camera too — the technique is the same, just adapted.',
                    'A before/after comparison closes out the video so you can see the actual difference editing makes.',
                ],
                keyPoints: [
                    'The technique, shown on real shots.',
                    'Before-and-after comparisons, not just theory.',
                    "Gear that actually matters here — and what doesn't.",
                    'A common mistake that ruins the shot.',
                    'Settings used for each example, shown on screen.',
                    'How to adapt this technique with just a phone camera.',
                ],
                chapters: ["The shot we're after", 'Camera settings', 'Taking the shot', 'The common mistake', 'Editing pass', 'Before vs after'],
                comments: [
                    'The before/after at the end sold me on trying this technique myself.',
                    'Settings shown on screen is such a small thing but so helpful, thank you.',
                    'Loved the editing and pacing, easy to follow even for a beginner.',
                    'This works with my phone camera exactly like you said, thanks!',
                    'Good content, but the audio could be a bit louder.',
                    'The common mistake section saved my last shoot from the same error.',
                    'This deserves way more views than it has.',
                    'Gear that actually matters section saved me from buying an expensive lens.',
                    'Sharing this with my photography club immediately.',
                    'Solid video overall, subscribed for more technique breakdowns.',
                ],
                closingLines: [
                    "That's the technique — try it and tag me in your results.",
                    'Gear list and settings used are all in the description.',
                    'Next video covers the editing workflow in more depth.',
                ],
            ),
            'finance' => new DemoCategoryBank(
                color: ['064e3b', '6ee7b7'],
                icon: '↑',
                descriptions: [
                    '"{title}" breaks this down in plain language, with nothing to sell you.',
                    'We use real numbers and realistic timelines, not best-case scenarios.',
                    'Not financial advice — this is general education, check your own situation before acting.',
                    'No sponsor from any bank, broker, or app mentioned in this video.',
                    'Numbers shown are adjusted for a realistic, average income, not a best-case example.',
                    'A worked example closes out the video so the math is concrete, not abstract.',
                ],
                keyPoints: [
                    'A jargon-free explanation of the topic.',
                    'Real numbers, not best-case projections.',
                    'The most common mistake people make here.',
                    'A realistic timeline for seeing results.',
                    'A worked example with actual numbers.',
                    'What to do next if this applies to your situation.',
                ],
                chapters: ['The problem', 'The concept', 'Doing the math', 'Common pitfalls', 'A worked example', 'Putting it into practice'],
                comments: [
                    'Finally a finance video with no sponsor pushing an app on me.',
                    'The worked example made the math click instantly.',
                    'This is exactly what I needed today, thank you.',
                    'Real numbers instead of "best case" projections, thank you.',
                    'The common pitfalls section saved me from a mistake I was about to make.',
                    'Good content, but the audio could be a bit louder.',
                    'This deserves way more views than it has.',
                    'Sharing this with my whole family group chat.',
                    'Realistic timeline instead of overnight promises, refreshing.',
                    'Solid video overall, subscribed for more of these breakdowns.',
                ],
                closingLines: [
                    "That's the breakdown — always double-check against your own numbers.",
                    'Not financial advice, just the math laid out plainly.',
                    'Next video tackles a related question from the comments.',
                ],
            ),
            'comedy' => new DemoCategoryBank(
                color: ['581c87', 'e9d5ff'],
                icon: '☺',
                descriptions: [
                    '"{title}" is exactly what it sounds like — and it gets worse from there, in a good way.',
                    'Full bloopers and behind-the-scenes chaos included at the end.',
                    'Written, shot, and edited by the same three people, for better or worse.',
                    'No laugh track — the reactions you hear are the actual crew watching playback.',
                    'This one took more takes than we\'d like to admit.',
                    'A blooper reel closes out the video, because the mistakes were funnier than the script.',
                ],
                keyPoints: [
                    'The premise escalates fast — stick with it.',
                    'Real reactions, not scripted ones.',
                    'Bloopers included at the end.',
                    'Written and shot by a tiny crew, for better or worse.',
                    'No laugh track — what you hear is the actual room.',
                    'A quick look behind the scenes after the sketch.',
                ],
                chapters: ['Setup', 'It escalates', 'The turn', 'Payoff', 'Behind the scenes', 'Bloopers'],
                comments: [
                    'The escalation in the middle got me, did not see that coming.',
                    'Bloopers at the end were funnier than the actual sketch, no offense.',
                    'This is exactly what I needed today, thank you.',
                    'No laugh track and it still had me laughing out loud alone.',
                    'The behind-the-scenes section is criminally underrated content.',
                    'This deserves way more views than it has.',
                    'Sharing this with everyone I know, this is too good.',
                    'Solid video overall, subscribed for more sketches like this.',
                    'Watched this three times already, still funny.',
                    'Written by three people and it shows in the best way, great chemistry.',
                ],
                closingLines: [
                    "That's the sketch — bloopers and behind-the-scenes are right after this.",
                    'New sketch drops next week, same chaos guaranteed.',
                    'Let us know in the comments which line was your favorite.',
                ],
            ),
            'diy' => new DemoCategoryBank(
                color: ['422006', 'fde047'],
                icon: '⚒',
                descriptions: [
                    '"{title}" is broken into steps you can actually follow, weekend by weekend if needed.',
                    'A rough materials list and cost estimate are covered up front.',
                    'No specialty tools required beyond what\'s listed at the start.',
                    'This is a real build, mistakes and fixes included, not a perfect timelapse.',
                    'Full dimensions and a cut list are in the description for anyone following along.',
                    'Built in a small space, so nothing here assumes a full workshop.',
                ],
                keyPoints: [
                    'A realistic materials list and cost estimate.',
                    'Step-by-step instructions, no assumed experience.',
                    'The mistake that costs the most time to fix.',
                    'How to adapt this if your space is different.',
                    'Full dimensions and a cut list, included in the description.',
                    'What to skip if you\'re short on time or tools.',
                ],
                chapters: ['Planning', 'Materials', 'Building it', 'Fixing a mistake', 'Finishing touches', 'The finished result'],
                comments: [
                    'The materials list and real cost estimate saved me from underbudgeting.',
                    'The mistake you fixed on camera is exactly what I did on my first attempt.',
                    'This is exactly what I needed today, thank you.',
                    'Good content, but the audio could be a bit louder in the workshop.',
                    'Cut list in the description made this so much easier to follow.',
                    'This deserves way more views than it has.',
                    'Built in a small space too, glad this wasn\'t workshop-only advice.',
                    'Sharing this with my whole DIY group chat.',
                    'Solid video overall, subscribed for the next build.',
                    'Real mistakes and fixes shown, way more useful than a perfect timelapse.',
                ],
                closingLines: [
                    "That's the finished build — full dimensions and cut list are in the description.",
                    'Let me know in the comments if you build your own version.',
                    'Next build is a reader request, coming soon.',
                ],
            ),
            'meta' => new DemoCategoryBank(
                color: ['18181b', 'f4f4f5'],
                icon: '★',
                descriptions: [
                    '"{title}" — a quick update straight from the team building MeTube.',
                    "We're keeping this short and to the point, as always.",
                    "Feedback from the last update shaped a good chunk of what's in this one.",
                    'Nothing here is final until it actually ships — plans can still change.',
                    'This is one of a series of short updates, not a big annual announcement.',
                    'Questions from the community inbox are answered directly in this one.',
                ],
                keyPoints: [
                    "What's changing and why.",
                    'What to expect next.',
                    'A quick thank-you to everyone who sent feedback.',
                    'What might still change before it ships.',
                    'Where to send more feedback or bug reports.',
                    'A rough timeline for what comes after this.',
                ],
                chapters: ['Intro', 'The update', 'Community feedback', "What's next"],
                comments: [
                    'Glad to see this shipped, been waiting for it.',
                    'Thanks for actually reading feedback and shipping it.',
                    'Short and to the point, appreciate not padding this out.',
                    'The community feedback section is a nice touch, feels heard.',
                    'This deserves way more views than it has.',
                    'Solid update overall, looking forward to the next one.',
                    'Sharing this with the rest of the team who use the platform.',
                    'Good to see the roadmap laid out this clearly.',
                    'Thanks for the transparency on what might still change.',
                    'Excited for what comes after this one.',
                ],
                closingLines: [
                    "That's the update — thanks for watching and for the feedback that shaped it.",
                    'More updates like this coming as things ship.',
                    'Drop feedback in the comments, we do read them.',
                ],
            ),
        ];
    }
}
