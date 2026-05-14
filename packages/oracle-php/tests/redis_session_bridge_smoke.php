<?php

declare(strict_types=1);

/**
 * Optional smoke: PHP Redis session handler ↔ JSON key format shared with emitted Node (D178/D273).
 * Skips when ext-redis is missing or CHRYSALIS_SESSION_REDIS_URL is unset.
 * With URL set, requires a reachable Redis (e.g. CI or local docker).
 */

require_once dirname(__DIR__) . '/src/Session/RedisChrysalisSessionHandler.php';

use Chrysalis\Oracle\Session\RedisChrysalisSessionHandler;

if (!extension_loaded('redis')) {
    fwrite(STDERR, "skip: phpredis not loaded\n");
    exit(0);
}

$url = getenv('CHRYSALIS_SESSION_REDIS_URL');
if ($url === false || $url === '') {
    fwrite(STDERR, "skip: CHRYSALIS_SESSION_REDIS_URL unset\n");
    exit(0);
}

$parts = parse_url($url);
if ($parts === false || !isset($parts['scheme'])) {
    fwrite(STDERR, "error: invalid URL\n");
    exit(1);
}
$scheme = strtolower((string) $parts['scheme']);
if ($scheme !== 'redis' && $scheme !== 'rediss') {
    fwrite(STDERR, "error: need redis:// or rediss:// URL\n");
    exit(1);
}

// Collision-resistant id compatible with default session charset/length rules.
$sid = session_create_id();
$key = 'chrysalis:sess:' . $sid;

$r = RedisChrysalisSessionHandler::connectRedis($url);

$r->del($key);

// Simulate Node-written JSON (empty object) — read path must accept
$r->set($key, '{}');

if (!RedisChrysalisSessionHandler::registerFromEnv()) {
    fwrite(STDERR, "error: registerFromEnv returned false\n");
    exit(1);
}

session_id($sid);
session_start();
if (!isset($_SESSION) || !is_array($_SESSION)) {
    fwrite(STDERR, "error: session not array\n");
    exit(1);
}
$_SESSION['smoke_marker'] = 42;
session_write_close();

$raw = $r->get($key);
if ($raw === false) {
    fwrite(STDERR, "error: missing key after write\n");
    exit(1);
}
$j = json_decode($raw, true);
if (!is_array($j) || ($j['smoke_marker'] ?? null) !== 42) {
    fwrite(STDERR, "error: JSON payload mismatch: {$raw}\n");
    exit(1);
}

$r->del($key);
echo "redis_session_bridge_smoke OK\n";
exit(0);
