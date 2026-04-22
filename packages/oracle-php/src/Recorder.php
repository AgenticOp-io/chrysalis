<?php

declare(strict_types=1);

namespace Chrysalis\Oracle;

use Chrysalis\Oracle\Sink\NdjsonSink;

/**
 * Request-scoped recorder.
 *
 * Holds the buffered event list, coordinates redaction, and is the single
 * authority on producing trace files. DB wrappers and other instrumentation
 * points call into the static methods of this class.
 */
final class Recorder
{
    public const SCHEMA_VERSION = '1.0.0';

    private static ?NdjsonSink $sink = null;
    private static ?Redactor $redactor = null;
    private static bool $started = false;
    private static string $traceId = '';
    private static float $startedAtMicro = 0.0;
    private static string $startedAtIso = '';
    private static string $responseBody = '';
    private static bool $responseBodyTruncated = false;

    /** @var array<int, array<string, mixed>> */
    private static array $events = [];

    /** @var array<string, mixed> */
    private static array $sessionPre = [];

    /** Maximum captured response body size (bytes). Larger bodies truncate. */
    private const MAX_BODY_BYTES = 1024 * 1024; // 1 MiB

    public static function init(NdjsonSink $sink, Redactor $redactor): void
    {
        self::$sink = $sink;
        self::$redactor = $redactor;
    }

    public static function isActive(): bool
    {
        return self::$sink !== null && self::$started;
    }

    public static function onRequestStart(): void
    {
        if (self::$sink === null) {
            return;
        }
        self::$started = true;
        self::$traceId = self::uuidV4();
        self::$startedAtMicro = microtime(true);
        self::$startedAtIso = self::isoFromMicro(self::$startedAtMicro);

        self::$sessionPre = isset($_SESSION) && is_array($_SESSION) ? $_SESSION : [];

        self::emit([
            'type' => 'http.request',
            'method' => (string)($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            'path' => self::requestPath(),
            'query' => self::asObject(self::stringMap($_GET)),
            'headers' => self::asObject(self::collectHeaders()),
            'cookies' => self::asObject(self::stringMap($_COOKIE)),
            'post' => self::asObject(self::jsonSafe($_POST)),
            'rawBody' => self::captureRawBody(),
            'session' => self::asObject(self::jsonSafe(self::$sessionPre)),
        ]);
    }

    public static function onOutputChunk(string $chunk): void
    {
        if (!self::$started) {
            return;
        }
        if (strlen(self::$responseBody) + strlen($chunk) > self::MAX_BODY_BYTES) {
            $remaining = self::MAX_BODY_BYTES - strlen(self::$responseBody);
            if ($remaining > 0) {
                self::$responseBody .= substr($chunk, 0, $remaining);
            }
            self::$responseBodyTruncated = true;
            return;
        }
        self::$responseBody .= $chunk;

        // Emit a cheap `php.echo` event so ingest can correlate template output
        // with source positions. We sample: one event per chunk, not per byte.
        $origin = self::callerOutsidePrelude();
        self::emit([
            'type' => 'php.echo',
            'size' => strlen($chunk),
            'origin' => $origin,
        ]);
    }

    public static function onSqlQuery(
        string $driver,
        string $sql,
        array $params,
        int $rowCount,
        array $rowShape,
        int $durationUs,
        array $origin
    ): void {
        if (!self::$started) {
            return;
        }
        self::emit([
            'type' => 'sql.query',
            'driver' => $driver,
            'sql' => $sql,
            'params' => self::jsonSafeList($params),
            'rowCount' => $rowCount,
            'rowShape' => $rowShape,
            'durationUs' => $durationUs,
            'origin' => $origin,
        ]);
    }

    public static function onHeader(string $header, bool $replace, ?int $httpResponseCode): void
    {
        if (!self::$started) {
            return;
        }
        self::emit([
            'type' => 'php.header',
            'header' => $header,
            'replace' => $replace,
            'httpResponseCode' => $httpResponseCode,
            'origin' => self::callerOutsidePrelude(),
        ]);
    }

    public static function onSetCookie(array $args): void
    {
        if (!self::$started) {
            return;
        }
        self::emit([
            'type' => 'php.setcookie',
            'name' => (string)($args['name'] ?? ''),
            'value' => (string)($args['value'] ?? ''),
            'expires' => (int)($args['expires'] ?? 0),
            'path' => (string)($args['path'] ?? ''),
            'domain' => (string)($args['domain'] ?? ''),
            'secure' => (bool)($args['secure'] ?? false),
            'httponly' => (bool)($args['httponly'] ?? false),
            'samesite' => isset($args['samesite']) ? (string)$args['samesite'] : null,
            'origin' => self::callerOutsidePrelude(),
        ]);
    }

    public static function onRequestEnd(): void
    {
        if (!self::$started || self::$sink === null) {
            return;
        }

        // Drain any remaining output buffer.
        if (ob_get_level() > 0) {
            @ob_end_flush();
        }

        $sessionPost = isset($_SESSION) && is_array($_SESSION) ? $_SESSION : [];

        self::emit([
            'type' => 'http.response',
            'status' => http_response_code() === false ? 200 : (int)http_response_code(),
            'headers' => self::asObject(self::collectResponseHeaders()),
            'body' => self::$responseBody,
            'bodyTruncated' => self::$responseBodyTruncated,
            'session' => self::asObject(self::jsonSafe($sessionPost)),
        ]);

        $endedAtMicro = microtime(true);
        $durationUs = (int)round(($endedAtMicro - self::$startedAtMicro) * 1_000_000);

        $header = [
            'type' => 'header',
            'schemaVersion' => self::SCHEMA_VERSION,
            'traceId' => self::$traceId,
            'startedAt' => self::$startedAtIso,
            'php' => ['version' => PHP_VERSION, 'sapi' => PHP_SAPI],
            'redaction' => [
                'configHash' => self::$redactor !== null ? self::$redactor->configHash() : '',
                'rules' => self::$redactor !== null ? self::$redactor->rules() : [],
            ],
        ];

        $footer = [
            'type' => 'footer',
            'endedAt' => self::isoFromMicro($endedAtMicro),
            'durationUs' => $durationUs,
            'eventCount' => count(self::$events),
            'exitStatus' => 0, // Best-effort; true exit code is unknowable here.
        ];

        self::$sink->writeTrace(self::$traceId, self::$startedAtIso, $header, self::$events, $footer);
    }

    /**
     * @param array<string, mixed> $event
     */
    private static function emit(array $event): void
    {
        if (self::$redactor !== null) {
            $event = self::$redactor->apply($event);
        }
        self::$events[] = $event;
    }

    /**
     * @return array{file: string, line: int}
     */
    public static function callerOutsidePrelude(): array
    {
        $trace = debug_backtrace(DEBUG_BACKTRACE_IGNORE_ARGS, 20);
        $preludeDir = __DIR__;
        foreach ($trace as $frame) {
            $file = $frame['file'] ?? '';
            if ($file === '' || strncmp($file, $preludeDir, strlen($preludeDir)) === 0) {
                continue;
            }
            return ['file' => (string)$file, 'line' => (int)($frame['line'] ?? 0)];
        }
        return ['file' => '<unknown>', 'line' => 0];
    }

    private static function requestPath(): string
    {
        $uri = (string)($_SERVER['REQUEST_URI'] ?? '/');
        $q = strpos($uri, '?');
        return $q === false ? $uri : substr($uri, 0, $q);
    }

    /**
     * @param array<mixed, mixed> $in
     * @return array<string, string>
     */
    private static function stringMap(array $in): array
    {
        $out = [];
        foreach ($in as $k => $v) {
            if (is_scalar($v) || $v === null) {
                $out[(string)$k] = $v === null ? '' : (string)$v;
            } else {
                $out[(string)$k] = json_encode($v, JSON_UNESCAPED_SLASHES) ?: '';
            }
        }
        return $out;
    }

    /**
     * @return array<string, string>
     */
    private static function collectHeaders(): array
    {
        $h = [];
        foreach ($_SERVER as $k => $v) {
            if (strncmp($k, 'HTTP_', 5) === 0) {
                $name = strtolower(str_replace('_', '-', substr($k, 5)));
                $h[$name] = (string)$v;
            } elseif (in_array($k, ['CONTENT_TYPE', 'CONTENT_LENGTH'], true)) {
                $h[strtolower(str_replace('_', '-', $k))] = (string)$v;
            }
        }
        return $h;
    }

    /**
     * @return array<string, string>
     */
    private static function collectResponseHeaders(): array
    {
        $out = [];
        foreach (headers_list() as $h) {
            $pos = strpos($h, ':');
            if ($pos === false) {
                continue;
            }
            $name = strtolower(trim(substr($h, 0, $pos)));
            $value = trim(substr($h, $pos + 1));
            $out[$name] = $value;
        }
        return $out;
    }

    private static function captureRawBody(): ?string
    {
        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method === 'GET' || $method === 'HEAD') {
            return null;
        }
        $input = @file_get_contents('php://input');
        if ($input === false || $input === '') {
            return null;
        }
        return strlen($input) > self::MAX_BODY_BYTES
            ? substr($input, 0, self::MAX_BODY_BYTES)
            : $input;
    }

    /**
     * @param mixed $v
     * @return mixed
     */
    private static function jsonSafe($v)
    {
        if (is_array($v)) {
            $out = [];
            foreach ($v as $k => $vv) {
                $out[(string)$k] = self::jsonSafe($vv);
            }
            return $out;
        }
        if (is_scalar($v) || $v === null) {
            return $v;
        }
        if (is_object($v)) {
            return ['__class' => get_class($v)];
        }
        if (is_resource($v)) {
            return ['__resource' => get_resource_type($v)];
        }
        return null;
    }

    /**
     * @param array<int|string, mixed> $v
     * @return array<int, mixed>
     */
    private static function jsonSafeList(array $v): array
    {
        $out = [];
        foreach (array_values($v) as $vv) {
            $out[] = self::jsonSafe($vv);
        }
        return $out;
    }

    /**
     * Ensure a value serializes as a JSON object (not an empty array). PHP's
     * associative arrays become `[]` rather than `{}` when empty; the trace
     * schema requires object-typed fields to always encode as objects.
     *
     * @param mixed $v
     * @return mixed
     */
    private static function asObject($v)
    {
        if (is_array($v) && count($v) === 0) {
            return new \stdClass();
        }
        return $v;
    }

    private static function isoFromMicro(float $micro): string
    {
        $secs = (int)$micro;
        $frac = (int)round(($micro - $secs) * 1000);
        return gmdate('Y-m-d\\TH:i:s', $secs) . sprintf('.%03dZ', $frac);
    }

    private static function uuidV4(): string
    {
        $data = random_bytes(16);
        $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
        $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
    }
}
