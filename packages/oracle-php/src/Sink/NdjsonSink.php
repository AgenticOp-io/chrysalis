<?php

declare(strict_types=1);

namespace Chrysalis\Oracle\Sink;

/**
 * NDJSON sink: one file per request, laid out as traces/<iso-date>/<uuid>.ndjson.
 *
 * Writes atomically: the file is first written under a `.tmp` suffix and then
 * renamed. This keeps `packages/oracle` (Node-side) safe to tail the directory
 * without ever reading half-written traces.
 */
final class NdjsonSink
{
    public function __construct(private string $root)
    {
    }

    /**
     * @param array<string, mixed>              $header
     * @param array<int, array<string, mixed>>  $events
     * @param array<string, mixed>              $footer
     */
    public function writeTrace(string $traceId, string $startedAtIso, array $header, array $events, array $footer): void
    {
        $day = substr($startedAtIso, 0, 10);
        $dir = rtrim($this->root, '/\\') . DIRECTORY_SEPARATOR . $day;
        if (!is_dir($dir) && !@mkdir($dir, 0777, true) && !is_dir($dir)) {
            return; // Unable to record — refuse silently rather than killing the request.
        }

        $finalPath = $dir . DIRECTORY_SEPARATOR . $traceId . '.ndjson';
        $tmpPath = $finalPath . '.tmp';

        $lines = [];
        $lines[] = self::encode($header);
        foreach ($events as $e) {
            $lines[] = self::encode($e);
        }
        $lines[] = self::encode($footer);
        $payload = implode("\n", $lines) . "\n";

        $h = @fopen($tmpPath, 'wb');
        if ($h === false) {
            return;
        }
        @fwrite($h, $payload);
        @fclose($h);
        @rename($tmpPath, $finalPath);
    }

    /**
     * @param array<string, mixed> $obj
     */
    private static function encode(array $obj): string
    {
        $json = json_encode(
            $obj,
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE
        );
        return $json === false ? '{}' : $json;
    }
}
