<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\StorageContract;
use App\DTOs\HlsRenditionProfile;
use App\Exceptions\TranscodeException;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

/**
 * Transcodes uploaded videos into an adaptive-bitrate HLS package and extracts
 * a compact audio track for transcription. Wraps ffmpeg/ffprobe invoked through
 * Symfony Process (no shell).
 *
 * Rendition selection is driven by source height and the ladder defined in
 * config/media.php (media.hls.renditions). When the source height fits more
 * than one rendition, a multi-rendition package is produced with a
 * filter_complex split+scale pass; otherwise the single-rendition path is used
 * and H.264/AAC streams are copied losslessly.
 */
class HlsTranscodeService
{
    public function __construct(private readonly StorageContract $storage) {}

    /**
     * Probe the duration of a media file in seconds.
     *
     * @param string $absPath Full filesystem path to the source file
     *
     * @return float|null Duration in seconds, or null when ffprobe cannot determine it
     */
    public function probeDuration(string $absPath): ?float
    {
        $output = $this->run([
            $this->ffprobe(),
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            $absPath,
        ]);

        $isNumeric = is_numeric($output);

        if (!$isNumeric) {
            return null;
        }

        return (float) $output;
    }

    /**
     * Probe the display height of the first video stream in pixels.
     *
     * Falls back to 1080 when the stream has no height metadata so callers
     * always get a usable value for rendition selection.
     *
     * @param string $absPath Full filesystem path to the source file
     *
     * @return int Source height in pixels
     */
    public function probeHeight(string $absPath): int
    {
        $output = $this->run([
            $this->ffprobe(),
            '-v', 'error',
            '-select_streams', 'v:0',
            '-show_entries', 'stream=height',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            $absPath,
        ]);

        $height = (int) $output;

        return $height > 0 ? $height : 1080;
    }

    /**
     * Select the renditions applicable for a given source height.
     *
     * Only renditions whose target height is ≤ the source height are included
     * (no upscaling). If the source is shorter than the lowest preset, a single
     * pass-through rendition at the native resolution is returned so the caller
     * always receives at least one entry.
     *
     * @param int $sourceHeight Source video height in pixels
     *
     * @return non-empty-list<HlsRenditionProfile> Sorted ascending by height
     */
    public function selectRenditions(int $sourceHeight): array
    {
        $ladder = $this->loadRenditionLadder();

        $applicable = [];

        foreach ($ladder as $profile) {
            if ($profile->height > $sourceHeight) {
                continue;
            }

            $applicable[] = $profile;
        }

        if ($applicable === []) {
            return [new HlsRenditionProfile($sourceHeight, '800k', '128k')];
        }

        return $applicable;
    }

    /**
     * Extract a single JPEG frame from a video for use as an auto-generated thumbnail.
     *
     * The frame is taken at 20% of the video duration (minimum 1 second) to avoid
     * black or unrepresentative frames near the start. The output is written to the
     * local temporary disk and the caller is responsible for publishing and cleaning it up.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $vuid Video public identifier used as the output filename stem
     * @param float $durationSeconds Total video duration in seconds
     *
     * @throws TranscodeException When ffmpeg exits with a non-zero code
     *
     * @return string Absolute filesystem path to the extracted JPEG
     */
    public function extractThumbnail(string $sourceAbsPath, string $vuid, float $durationSeconds): string
    {
        $seekSeconds = (string) max(1.0, $durationSeconds * 0.20);
        $dest = $this->storage->tempPath("uploads/tmp/thumb_{$vuid}.jpg");

        $this->run([
            $this->ffmpeg(), '-y',
            '-ss', $seekSeconds,
            '-i', $sourceAbsPath,
            '-vframes', '1',
            '-q:v', '2',
            $dest,
        ]);

        return $dest;
    }

    /**
     * Transcode a source video into an adaptive-bitrate HLS package under hls/{vuid}/.
     *
     * When the source fits more than one rendition the output is a multi-rendition
     * master playlist that Shaka can switch between automatically. When only one
     * rendition applies (source < 480p) the single-rendition path is used and
     * H.264/AAC streams are remuxed losslessly with `-c copy`.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $vuid Video public identifier used as the output directory name
     *
     * @throws TranscodeException When ffmpeg exits with a non-zero code
     *
     * @return string Public-disk-relative path to the master playlist: hls/{vuid}/master.m3u8
     */
    public function transcode(string $sourceAbsPath, string $vuid): string
    {
        $dir = $this->ensureHlsDirectory($vuid);
        $hasAudio = $this->hasAudioStream($sourceAbsPath);
        $sourceHeight = $this->probeHeight($sourceAbsPath);
        $renditions = $this->selectRenditions($sourceHeight);
        $segmentDuration = (string) config('media.hls.segment_duration', 6);

        $isSingleRendition = count($renditions) === 1;

        $command = $isSingleRendition
            ? $this->buildSingleRenditionCommand($sourceAbsPath, $dir, $hasAudio, $segmentDuration)
            : $this->buildMultiRenditionCommand($sourceAbsPath, $dir, $renditions, $hasAudio, $segmentDuration);

        $this->run($command);

        return "{$this->hlsDirectory($vuid)}/master.m3u8";
    }

    /**
     * Extract a compact AAC audio track to hls/{vuid}/audio.m4a for transcription.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $vuid Video public identifier used as the output directory name
     *
     * @throws TranscodeException When ffmpeg exits with a non-zero code
     *
     * @return string Public-disk-relative path to the audio file: hls/{vuid}/audio.m4a
     */
    public function extractAudio(string $sourceAbsPath, string $vuid): string
    {
        $dir = $this->ensureHlsDirectory($vuid);
        $bitrate = (string) config('media.hls.audio_bitrate', '128k');

        $this->run([
            $this->ffmpeg(), '-y',
            '-i', $sourceAbsPath,
            '-vn',
            '-c:a', 'aac',
            '-b:a', $bitrate,
            "{$dir}/audio.m4a",
        ]);

        return "{$this->hlsDirectory($vuid)}/audio.m4a";
    }

    /**
     * Build the ffmpeg command for a single-rendition HLS package.
     *
     * Copies H.264/AAC streams losslessly; otherwise re-encodes once.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $dir Absolute path to the HLS output directory
     * @param bool $hasAudio Whether the source has an audio stream
     * @param string $segmentDuration HLS segment duration in seconds
     *
     * @return list<string> ffmpeg command tokens
     */
    private function buildSingleRenditionCommand(
        string $sourceAbsPath,
        string $dir,
        bool $hasAudio,
        string $segmentDuration,
    ): array {
        $videoArgs = $this->isH264($sourceAbsPath)
            ? ['-c:v', 'copy']
            : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23'];

        $audioArgs = $this->resolveAudioArgs($sourceAbsPath, $hasAudio);
        $streamMap = $hasAudio ? 'v:0,a:0' : 'v:0';
        $maps = $hasAudio ? ['-map', '0:v:0', '-map', '0:a:0'] : ['-map', '0:v:0'];

        return array_merge(
            [$this->ffmpeg(), '-y', '-i', $sourceAbsPath],
            $maps,
            $videoArgs,
            $audioArgs,
            [
                '-f', 'hls',
                '-hls_time', $segmentDuration,
                '-hls_playlist_type', 'vod',
                '-hls_segment_filename', "{$dir}/v%v/seg_%03d.ts",
                '-master_pl_name', 'master.m3u8',
                '-var_stream_map', $streamMap,
                "{$dir}/v%v/index.m3u8",
            ],
        );
    }

    /**
     * Build the ffmpeg command for a multi-rendition adaptive-bitrate HLS package.
     *
     * Uses filter_complex to split and scale the video stream in a single pass.
     * All renditions share the same libx264 preset; bitrates differ per rendition.
     * Audio is re-encoded once per rendition (AAC is cheap) so each variant has
     * its own audio track and var_stream_map can pair them without a separate
     * EXT-X-MEDIA group.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $dir Absolute path to the HLS output directory
     * @param non-empty-list<HlsRenditionProfile> $renditions Profiles sorted ascending by height
     * @param bool $hasAudio Whether the source has an audio stream
     * @param string $segmentDuration HLS segment duration in seconds
     *
     * @return list<string> ffmpeg command tokens
     */
    private function buildMultiRenditionCommand(
        string $sourceAbsPath,
        string $dir,
        array $renditions,
        bool $hasAudio,
        string $segmentDuration,
    ): array {
        $count = count($renditions);
        $filterComplex = $this->buildFilterComplex($renditions, $count);

        $command = [$this->ffmpeg(), '-y', '-i', $sourceAbsPath, '-filter_complex', $filterComplex];
        $command = array_merge($command, $this->buildVideoOutputMaps($renditions));

        if ($hasAudio) {
            $command = array_merge($command, $this->buildAudioInputMaps($count));
        }

        $command = array_merge($command, ['-c:v', 'libx264', '-preset', 'veryfast']);
        $command = array_merge($command, $this->buildPerRenditionVideoBitrates($renditions));

        if ($hasAudio) {
            $command = array_merge($command, $this->buildAudioEncoderArgs($renditions));
        }

        $varStreamMap = $this->buildVarStreamMap($count, $hasAudio);

        return array_merge($command, [
            '-f', 'hls',
            '-hls_time', $segmentDuration,
            '-hls_playlist_type', 'vod',
            '-hls_segment_filename', "{$dir}/v%v/seg_%03d.ts",
            '-master_pl_name', 'master.m3u8',
            '-var_stream_map', $varStreamMap,
            "{$dir}/v%v/index.m3u8",
        ]);
    }

    /**
     * Build the filter_complex string that splits and scales the video stream.
     *
     * @param non-empty-list<HlsRenditionProfile> $renditions
     */
    private function buildFilterComplex(array $renditions, int $count): string
    {
        // -2 for width means "scale proportionally, round to even number"
        $splitPart = "[0:v]split={$count}";
        $splitLabels = '';
        $scaleParts = [];

        foreach ($renditions as $i => $rendition) {
            $splitLabels .= "[v{$i}]";
            $scaleParts[] = "[v{$i}]scale=-2:{$rendition->height}[out{$i}]";
        }

        return $splitPart . $splitLabels . ';' . implode(';', $scaleParts);
    }

    /**
     * Build the `-map [outN]` tokens for each video rendition output.
     *
     * @param non-empty-list<HlsRenditionProfile> $renditions
     *
     * @return list<string>
     */
    private function buildVideoOutputMaps(array $renditions): array
    {
        $tokens = [];

        foreach ($renditions as $i => $_) {
            $tokens[] = '-map';
            $tokens[] = "[out{$i}]";
        }

        return $tokens;
    }

    /**
     * Build one `-map 0:a` pair per rendition so var_stream_map can pair v:N with a:N.
     *
     * @return list<string>
     */
    private function buildAudioInputMaps(int $count): array
    {
        $tokens = [];

        for ($i = 0; $i < $count; $i++) {
            $tokens[] = '-map';
            $tokens[] = '0:a';
        }

        return $tokens;
    }

    /**
     * Build the per-rendition video bitrate tokens (-b:v:N, -maxrate:v:N, -bufsize:v:N).
     *
     * @param non-empty-list<HlsRenditionProfile> $renditions
     *
     * @return list<string>
     */
    private function buildPerRenditionVideoBitrates(array $renditions): array
    {
        $tokens = [];

        foreach ($renditions as $i => $rendition) {
            $bufsize = $this->doubleRate($rendition->videoBitrate);
            $tokens[] = "-b:v:{$i}";
            $tokens[] = $rendition->videoBitrate;
            $tokens[] = "-maxrate:v:{$i}";
            $tokens[] = $rendition->videoBitrate;
            $tokens[] = "-bufsize:v:{$i}";
            $tokens[] = $bufsize;
        }

        return $tokens;
    }

    /**
     * Build the audio encoder token and per-rendition audio bitrate tokens.
     *
     * @param non-empty-list<HlsRenditionProfile> $renditions
     *
     * @return list<string>
     */
    private function buildAudioEncoderArgs(array $renditions): array
    {
        $tokens = ['-c:a', 'aac'];

        foreach ($renditions as $i => $rendition) {
            $tokens[] = "-b:a:{$i}";
            $tokens[] = $rendition->audioBitrate;
        }

        return $tokens;
    }

    /**
     * Build the var_stream_map value pairing each video stream with its audio counterpart.
     */
    private function buildVarStreamMap(int $count, bool $hasAudio): string
    {
        $streamPairs = [];

        for ($i = 0; $i < $count; $i++) {
            $streamPairs[] = $hasAudio ? "v:{$i},a:{$i}" : "v:{$i}";
        }

        return implode(' ', $streamPairs);
    }

    /**
     * Load and parse the rendition ladder from config.
     *
     * Returns only entries with a positive height and non-empty bitrate strings,
     * sorted ascending by height.
     *
     * @return list<HlsRenditionProfile>
     */
    private function loadRenditionLadder(): array
    {
        $raw = config('media.hls.renditions');

        if (!is_array($raw)) {
            return [];
        }

        $profiles = [];

        foreach ($raw as $item) {
            if (!is_array($item)) {
                continue;
            }

            $height = isset($item['height']) && is_int($item['height']) ? $item['height'] : 0;
            $videoBitrate = isset($item['video_bitrate']) && is_string($item['video_bitrate'])
                ? $item['video_bitrate']
                : '';
            $audioBitrate = isset($item['audio_bitrate']) && is_string($item['audio_bitrate'])
                ? $item['audio_bitrate']
                : '128k';

            $isValid = $height > 0 && $videoBitrate !== '';

            if (!$isValid) {
                continue;
            }

            $profiles[] = new HlsRenditionProfile($height, $videoBitrate, $audioBitrate);
        }

        usort($profiles, fn (HlsRenditionProfile $a, HlsRenditionProfile $b) => $a->height <=> $b->height);

        return $profiles;
    }

    /**
     * Double a bitrate string to compute a suitable VBV buffer size.
     *
     * Supports "k" and "M" suffixes (case-insensitive). Returns the input
     * unchanged when the format is not recognised.
     *
     * @param string $bitrate Bitrate string (e.g. "2800k", "5M")
     *
     * @return string Doubled bitrate (e.g. "5600k", "10M")
     */
    private function doubleRate(string $bitrate): string
    {
        $isMatch = preg_match('/^(\d+)([kKmM]?)$/', $bitrate, $m) === 1;

        if (!$isMatch) {
            return $bitrate;
        }

        return ((int) $m[1] * 2) . $m[2];
    }

    /**
     * Resolve the audio encoding arguments for the single-rendition path.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param bool $hasAudio Whether the source has an audio stream
     *
     * @return list<string> ffmpeg audio arguments
     */
    private function resolveAudioArgs(string $sourceAbsPath, bool $hasAudio): array
    {
        if (!$hasAudio) {
            return [];
        }

        if ($this->isAac($sourceAbsPath)) {
            return ['-c:a', 'copy'];
        }

        $bitrate = (string) config('media.hls.audio_bitrate', '128k');

        return ['-c:a', 'aac', '-b:a', $bitrate];
    }

    /**
     * Determine whether the source video stream is already H.264.
     */
    private function isH264(string $sourceAbsPath): bool
    {
        return $this->probeCodec($sourceAbsPath, 'v') === 'h264';
    }

    /**
     * Determine whether the source audio stream is already AAC.
     */
    private function isAac(string $sourceAbsPath): bool
    {
        return $this->probeCodec($sourceAbsPath, 'a') === 'aac';
    }

    /**
     * Determine whether the source has at least one audio stream.
     */
    private function hasAudioStream(string $sourceAbsPath): bool
    {
        return $this->probeCodec($sourceAbsPath, 'a') !== '';
    }

    /**
     * Probe the codec name of the first stream of the given type.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $type Stream selector: "v" for video, "a" for audio
     *
     * @return string Codec name (e.g. "h264", "aac"), or an empty string when absent
     */
    private function probeCodec(string $sourceAbsPath, string $type): string
    {
        return $this->run([
            $this->ffprobe(),
            '-v', 'error',
            '-select_streams', "{$type}:0",
            '-show_entries', 'stream=codec_name',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            $sourceAbsPath,
        ]);
    }

    /**
     * Create (if missing) the absolute HLS output directory for a video.
     *
     * @return string Absolute filesystem path to hls/{vuid}
     */
    private function ensureHlsDirectory(string $vuid): string
    {
        $dir = $this->storage->publicPath($this->hlsDirectory($vuid));
        $isMissing = !is_dir($dir);

        if ($isMissing) {
            mkdir($dir, 0755, true);
        }

        return $dir;
    }

    /**
     * Public-disk-relative HLS directory for a video.
     */
    private function hlsDirectory(string $vuid): string
    {
        return "hls/{$vuid}";
    }

    /**
     * Run an ffmpeg/ffprobe command and return its trimmed stdout.
     *
     * @param list<string> $command Command and arguments (no shell)
     *
     * @throws TranscodeException When the process exits with a non-zero code
     *
     * @return string Trimmed standard output
     */
    private function run(array $command): string
    {
        $process = new Process($command);
        $process->setTimeout((float) config('media.hls.process_timeout', 3600));

        try {
            $process->mustRun();
        } catch (ProcessFailedException $e) {
            throw TranscodeException::commandFailed($e->getMessage(), $e);
        }

        return trim($process->getOutput());
    }

    private function ffmpeg(): string
    {
        return (string) config('media.hls.ffmpeg', 'ffmpeg');
    }

    private function ffprobe(): string
    {
        return (string) config('media.hls.ffprobe', 'ffprobe');
    }
}
