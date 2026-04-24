<?php

declare(strict_types=1);

namespace Chrysalis\Oracle;

/**
 * Wraps built-in HTTP(S) streams so outbound URL fetches are recorded as
 * `http.outbound` events. Registration swaps php's `http` and `https`
 * wrappers for the duration of observe mode.
 */
final class HttpStreamWrapper
{
    /** @var resource|null */
    public $context;

    /** @var resource|null */
    private $handle;

    /** @var array{file: string, line: int} */
    private array $origin;

    private int $startUs = 0;

    private string $openedUrl = '';

    private int $responseBytes = 0;

    public static function register(): void
    {
        foreach (['http', 'https'] as $protocol) {
            if (!in_array($protocol, stream_get_wrappers(), true)) {
                continue;
            }
            @stream_wrapper_unregister($protocol);
            if (!@stream_wrapper_register($protocol, self::class, STREAM_IS_URL)) {
                error_log('Chrysalis Oracle: failed to register stream wrapper for ' . $protocol);
            }
        }
    }

    /**
     * @param resource|null $context
     */
    public function stream_open(string $path, string $mode, int $options, ?string &$opened_path): bool
    {
        $this->startUs = (int) round(microtime(true) * 1_000_000);
        $this->openedUrl = $path;
        $this->responseBytes = 0;
        $this->origin = Recorder::callerOutsidePrelude();
        $this->handle = null;

        @stream_wrapper_unregister('http');
        @stream_wrapper_unregister('https');
        try {
            $ctx = is_resource($this->context) ? $this->context : null;
            $h = @fopen($path, $mode, ($options & STREAM_REPORT_ERRORS) !== 0, $ctx);
        } finally {
            @stream_wrapper_register('http', self::class, STREAM_IS_URL);
            @stream_wrapper_register('https', self::class, STREAM_IS_URL);
        }

        if ($h === false) {
            return false;
        }
        $this->handle = $h;
        $opened_path = $path;

        return true;
    }

    /**
     * @return string|false
     */
    public function stream_read(int $count)
    {
        if (!is_resource($this->handle)) {
            return false;
        }
        $data = fread($this->handle, $count);
        if (is_string($data) && $data !== '') {
            $this->responseBytes += strlen($data);
        }

        return $data;
    }

    public function stream_eof(): bool
    {
        return !is_resource($this->handle) || feof($this->handle);
    }

    /**
     * @return array|false
     */
    public function stream_stat()
    {
        return is_resource($this->handle) ? fstat($this->handle) : false;
    }

    public function stream_close(): void
    {
        if (!is_resource($this->handle)) {
            return;
        }

        $meta = stream_get_meta_data($this->handle);
        $status = 0;
        if (isset($meta['wrapper_data']) && is_array($meta['wrapper_data'])) {
            foreach ($meta['wrapper_data'] as $line) {
                if (is_string($line) && preg_match('#HTTP/\S+\s+(\d{3})#', $line, $m)) {
                    $status = (int) $m[1];
                    break;
                }
            }
        }

        $endUs = (int) round(microtime(true) * 1_000_000);
        $durationUs = max(0, $endUs - $this->startUs);

        $opts = [];
        if (is_resource($this->context)) {
            $raw = @stream_context_get_options($this->context);
            $opts = is_array($raw) ? $raw : [];
        }
        $method = 'GET';
        if (isset($opts['http']['method']) && is_string($opts['http']['method'])) {
            $method = strtoupper($opts['http']['method']);
        }

        Recorder::onOutboundHttp($method, $this->openedUrl, $status, $this->responseBytes, $durationUs, $this->origin);

        fclose($this->handle);
        $this->handle = null;
    }

    public function stream_flush(): bool
    {
        return is_resource($this->handle) ? fflush($this->handle) : false;
    }

    public function stream_seek(int $offset, int $whence = SEEK_SET): bool
    {
        return false;
    }

    /**
     * @return array|false
     */
    public function url_stat(string $path, int $flags)
    {
        return false;
    }
}
