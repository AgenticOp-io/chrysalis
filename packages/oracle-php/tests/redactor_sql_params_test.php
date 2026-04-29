<?php

declare(strict_types=1);

/**
 * Smoke test for sql.params[driver:prefix].index bind redaction
 * (run: php packages/oracle-php/tests/redactor_sql_params_test.php).
 */

require dirname(__DIR__) . '/src/Redactor.php';

use Chrysalis\Oracle\Redactor;

$r = new Redactor([
    ['path' => 'sql.params[pdo:UPDATE users SET password = ?].1', 'kind' => 'hash'],
    ['path' => 'sql.params[*:INSERT INTO sessions].0', 'kind' => 'mask'],
]);

$event = [
    'type' => 'sql.query',
    'driver' => 'pdo',
    'sql' => 'UPDATE users SET password = ? WHERE id = ?',
    'params' => ['ignored', 'secret-bind', 99],
    'rowCount' => 0,
    'rowShape' => [],
    'durationUs' => 1,
    'origin' => ['file' => 'x.php', 'line' => 1],
];

$out = $r->apply($event);
$params = $out['params'];
if (!is_array($params)) {
    fwrite(STDERR, "expected params array\n");
    exit(1);
}
$p1 = (string)($params[1] ?? '');
if (!str_starts_with($p1, 'sha256:')) {
    fwrite(STDERR, "param index 1 should be hashed, got {$p1}\n");
    exit(1);
}

$event2 = [
    'type' => 'sql.query',
    'driver' => 'mysqli',
    'sql' => 'INSERT INTO sessions VALUES (?, ?)',
    'params' => ['sess-token', 'other'],
    'rowCount' => 0,
    'rowShape' => [],
    'durationUs' => 1,
    'origin' => ['file' => 'x.php', 'line' => 1],
];
$out2 = $r->apply($event2);
$params2 = $out2['params'];
if (($params2[0] ?? '') !== '***REDACTED***') {
    fwrite(STDERR, "wildcard driver param 0 not masked\n");
    exit(1);
}

// SELECT-shaped (non-empty rowShape): never redact params (tape param matching).
$r2 = new Redactor([
    ['path' => 'sql.params[*:SELECT id FROM users].0', 'kind' => 'mask'],
]);
$sel = [
    'type' => 'sql.query',
    'driver' => 'pdo',
    'sql' => 'SELECT id FROM users WHERE secret = ?',
    'params' => ['should-not-mask'],
    'rowCount' => 1,
    'rowShape' => ['id'],
    'durationUs' => 1,
    'origin' => ['file' => 'x.php', 'line' => 1],
    'rows' => [['id' => 1]],
];
$selOut = $r2->apply($sel);
$sp = $selOut['params'];
if (!is_array($sp) || ($sp[0] ?? '') !== 'should-not-mask') {
    fwrite(STDERR, "SELECT-shaped params must not be redacted\n");
    exit(1);
}

echo "ok\n";
