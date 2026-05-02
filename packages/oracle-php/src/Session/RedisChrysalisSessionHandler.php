<?php

declare(strict_types=1);

namespace Chrysalis\Oracle\Session;

/**
 * PHP session save handler compatible with emitted Hono/Fastify Redis sessions (DESIGN D178 / D273).
 *
 * Redis keys: `chrysalis:sess:<session_id>` — JSON object payload, same as Node `CHRYSALIS_SESSION_REDIS_URL` mode.
 * Requires the **phpredis** extension (`ext-redis`). Call {@see registerFromEnv()} before `session_start()`.
 *
 * Uses `session.serialize_handler = php_serialize` so session arrays round-trip through JSON in Redis.
 */
final class RedisChrysalisSessionHandler implements \SessionHandlerInterface
{
    private ?\Redis $redis = null;

    public function __construct(private readonly string $redisUrl)
    {
    }

    /**
     * When `CHRYSALIS_SESSION_REDIS_URL` is set, registers this handler and aligns `session.name` with
     * `CHRYSALIS_SESSION_COOKIE` (default `chrysalis_sid`, matching emitted apps). Idempotent if already registered.
     *
     * @throws \RuntimeException when the URL is set but ext-redis is not loaded
     */
    public static function registerFromEnv(): bool
    {
        $url = getenv('CHRYSALIS_SESSION_REDIS_URL');
        if ($url === false || $url === '') {
            return false;
        }
        if (!extension_loaded('redis')) {
            throw new \RuntimeException(
                'CHRYSALIS_SESSION_REDIS_URL is set but the phpredis extension (redis) is not loaded.',
            );
        }
        if (session_status() !== \PHP_SESSION_NONE) {
            throw new \RuntimeException('RedisChrysalisSessionHandler::registerFromEnv must run before session_start().');
        }
        ini_set('session.serialize_handler', 'php_serialize');
        $cookie = getenv('CHRYSALIS_SESSION_COOKIE');
        if (is_string($cookie) && $cookie !== '') {
            ini_set('session.name', $cookie);
        }
        $handler = new self($url);
        session_set_save_handler($handler, true);

        return true;
    }

    public function open($path, $name): bool
    {
        try {
            $this->redis = self::connectRedis($this->redisUrl);
        } catch (\Throwable) {
            $this->redis = null;

            return false;
        }

        return true;
    }

    public function close(): bool
    {
        if ($this->redis !== null) {
            try {
                $this->redis->close();
            } catch (\Throwable) {
                // ignore
            }
            $this->redis = null;
        }

        return true;
    }

    public function read($id): string|false
    {
        $r = $this->redis;
        if ($r === null) {
            return false;
        }
        $raw = $r->get(self::redisKey($id));
        if ($raw === false || $raw === '') {
            return '';
        }
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            return '';
        }

        return serialize($decoded);
    }

    public function write($id, $data): bool
    {
        $r = $this->redis;
        if ($r === null) {
            return false;
        }
        if ($data === '') {
            return true;
        }
        $arr = @unserialize($data, ['allowed_classes' => false]);
        if (!is_array($arr)) {
            return false;
        }
        $payload = self::sessionArrayToJsonPayload($arr);
        try {
            return $r->set(self::redisKey($id), $payload);
        } catch (\Throwable) {
            return false;
        }
    }

    public function destroy($id): bool
    {
        $r = $this->redis;
        if ($r === null) {
            return false;
        }
        try {
            $r->del(self::redisKey($id));
        } catch (\Throwable) {
            return false;
        }

        return true;
    }

    /**
     * @param int $max_lifetime
     */
    public function gc($max_lifetime): int|false
    {
        return 0;
    }

    private static function redisKey(string $sessionId): string
    {
        return 'chrysalis:sess:' . $sessionId;
    }

    /**
     * @param array<mixed> $arr
     */
    private static function sessionArrayToJsonPayload(array $arr): string
    {
        if ($arr === []) {
            return '{}';
        }

        return json_encode($arr, \JSON_THROW_ON_ERROR | \JSON_UNESCAPED_UNICODE);
    }

    private static function connectRedis(string $url): \Redis
    {
        $parts = parse_url($url);
        if ($parts === false || !isset($parts['scheme']) || $parts['scheme'] !== 'redis') {
            throw new \InvalidArgumentException('CHRYSALIS_SESSION_REDIS_URL must be a redis:// URL');
        }
        $host = $parts['host'] ?? '127.0.0.1';
        $port = isset($parts['port']) ? (int) $parts['port'] : 6379;
        $r = new \Redis();
        if (!$r->connect($host, $port)) {
            throw new \RuntimeException('Redis connect failed for session bridge');
        }
        if (isset($parts['pass']) && $parts['pass'] !== '') {
            if (!$r->auth($parts['pass'])) {
                throw new \RuntimeException('Redis AUTH failed for session bridge');
            }
        }
        $path = $parts['path'] ?? '/0';
        $db = (int) ltrim((string) $path, '/');
        if ($db > 0) {
            if (!$r->select($db)) {
                throw new \RuntimeException('Redis SELECT failed for session bridge');
            }
        }

        return $r;
    }
}
