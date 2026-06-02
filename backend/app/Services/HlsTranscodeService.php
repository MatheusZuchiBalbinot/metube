<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\TranscodeException;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Process\Process;

/**
 * Transcodes uploaded videos into a native HLS package (master playlist + segments)
 * and extracts a compact audio track for transcription. Wraps ffmpeg/ffprobe, which
 * are invoked through Symfony Process without a shell.
 *
 * A single rendition is produced: when the source is already H.264/AAC the streams are
 * remuxed with `-c copy` (near-instant, lossless); otherwise they are re-encoded once
 * to H.264/AAC for broad browser compatibility.
 */
class HlsTranscodeService
{
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
     * Transcode a source video into a single-rendition HLS package under hls/{vuid}/.
     *
     * Streams are copied when already H.264/AAC, otherwise re-encoded. A master.m3u8 is
     * emitted alongside the media playlist so Shaka can read the rendition's resolution
     * and codecs.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $vuid Video public identifier used as the output directory name
     *
     * @return string Public-disk-relative path to the master playlist: hls/{vuid}/master.m3u8
     */
    public function transcode(string $sourceAbsPath, string $vuid): string
    {
        $dir = $this->ensureHlsDirectory($vuid);

        $hasAudio = $this->hasAudioStream($sourceAbsPath);

        $videoArgs = $this->isH264($sourceAbsPath)
            ? ['-c:v', 'copy']
            : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23'];

        $audioArgs = $this->resolveAudioArgs($sourceAbsPath, $hasAudio);
        $streamMap = $hasAudio ? 'v:0,a:0' : 'v:0';
        $maps = $hasAudio ? ['-map', '0:v:0', '-map', '0:a:0'] : ['-map', '0:v:0'];

        $segmentDuration = (string) config('media.hls.segment_duration', 6);

        $command = array_merge(
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

        $this->run($command);

        return "{$this->hlsDirectory($vuid)}/master.m3u8";
    }

    /**
     * Extract a compact AAC audio track to hls/{vuid}/audio.m4a for transcription.
     *
     * @param string $sourceAbsPath Full filesystem path to the source video
     * @param string $vuid Video public identifier used as the output directory name
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
     * Resolve the audio encoding arguments: copy when already AAC, otherwise re-encode.
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
        $dir = Storage::disk('public')->path($this->hlsDirectory($vuid));
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
     * @throws TranscodeException When the process fails
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
