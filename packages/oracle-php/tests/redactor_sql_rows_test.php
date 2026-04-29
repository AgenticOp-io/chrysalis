<?php

declare(strict_types=1);

/**
 * Smoke test for sql.row.* redaction (run: php packages/oracle-php/tests/redactor_sql_rows_test.php).
 */

require dirname(__DIR__) . '/src/Redactor.php';

use Chrysalis\Oracle\Redactor;

$r = new Redactor([
    ['path' => 'sql.row.password', 'kind' => 'hash'],
    ['path' => 'sql.row.Token', 'kind' => 'mask'],
]);

$event = [
    'type' => 'sql.query',
    'driver' => 'pdo',
    'sql' => 'SELECT id, password, token FROM users',
    'params' => [],
    'rowCount' => 1,
    'rowShape' => [],
    'durationUs' => 1,
    'origin' => ['file' => 'x.php', 'line' => 1],
    'rows' => [
        ['id' => 1, 'password' => 'plain-secret', 'token' => 'bearer'],
    ],
];

$out = $r->apply($event);
$rows = $out['rows'][0];
if (!is_array($rows)) {
    fwrite(STDERR, "expected rows[0] array\n");
    exit(1);
}
$pw = (string)($rows['password'] ?? '');
if (!str_starts_with($pw, 'sha256:')) {
    fwrite(STDERR, "password not hashed: {$pw}\n");
    exit(1);
}
if (($rows['token'] ?? '') !== '***REDACTED***') {
    fwrite(STDERR, "token not masked\n");
    exit(1);
}
if ((int)($rows['id'] ?? 0) !== 1) {
    fwrite(STDERR, "id should be untouched\n");
    exit(1);
}

echo "ok\n";
