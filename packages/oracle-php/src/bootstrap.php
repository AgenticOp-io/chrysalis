<?php

declare(strict_types=1);

/**
 * Chrysalis Oracle — PHP side entrypoint.
 *
 * Loaded via `auto_prepend_file` OR required manually at the top of a front
 * controller. Either way, it starts recording a trace for the current request
 * and registers a shutdown handler to flush it to disk.
 *
 * Environment variables (read at load time; set these from `chrysalis observe`):
 *   CHRYSALIS_TRACE_DIR      absolute path to the root traces directory
 *   CHRYSALIS_REDACTION_JSON JSON string of the redaction config
 *   CHRYSALIS_DISABLE        set to "1" to no-op the prelude (for testing)
 */

namespace Chrysalis\Oracle;

require_once __DIR__ . '/Recorder.php';
require_once __DIR__ . '/Redactor.php';
require_once __DIR__ . '/HttpStreamWrapper.php';
require_once __DIR__ . '/Mail.php';
require_once __DIR__ . '/Sink/NdjsonSink.php';
require_once __DIR__ . '/Db/Statement.php';
require_once __DIR__ . '/Db/PDO.php';
require_once __DIR__ . '/Db/MySQLiStatement.php';
require_once __DIR__ . '/Db/MySQLi.php';

if (getenv('CHRYSALIS_DISABLE') === '1') {
    return;
}

$traceDir = getenv('CHRYSALIS_TRACE_DIR');
if ($traceDir === false || $traceDir === '') {
    // No directory configured — run as a no-op so a forgotten prelude doesn't
    // break a dev machine.
    return;
}

$redactionJson = getenv('CHRYSALIS_REDACTION_JSON');
$redaction = $redactionJson !== false && $redactionJson !== ''
    ? (json_decode($redactionJson, true) ?: ['rules' => []])
    : ['rules' => []];

$sink = new Sink\NdjsonSink($traceDir);
$redactor = new Redactor($redaction['rules'] ?? []);
Recorder::init($sink, $redactor);
HttpStreamWrapper::register();

// Session state — if the app calls session_start(), we capture the snapshot
// pre-handler. The response snapshot is captured at shutdown.
if (session_status() === PHP_SESSION_NONE) {
    // Do not auto-start session; the app decides. We'll read $_SESSION at
    // shutdown if it's populated.
}

Recorder::onRequestStart();

// Output buffering — capture the response body as the handler writes it.
ob_start(function (string $chunk) {
    Recorder::onOutputChunk($chunk);
    return $chunk;
});

register_shutdown_function(static function (): void {
    Recorder::onRequestEnd();
});
