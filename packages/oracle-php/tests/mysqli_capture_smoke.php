<?php

declare(strict_types=1);

/**
 * End-to-end smoke: real mysqli + Chrysalis\Oracle\Db\MySQLi against a live MySQL
 * server, with Recorder producing NDJSON containing mysqli sql.query events.
 *
 * Skips with exit 0 unless CHRYSALIS_MYSQLI_SMOKE=1 (CI sets this with a MySQL service).
 * Retries the TCP connect so the job does not race MySQL startup.
 */

if (getenv('CHRYSALIS_MYSQLI_SMOKE') !== '1') {
    fwrite(STDERR, "mysqli_capture_smoke: skipped (set CHRYSALIS_MYSQLI_SMOKE=1 to run)\n");
    exit(0);
}

if (!extension_loaded('mysqli')) {
    fwrite(STDERR, "mysqli extension is required\n");
    exit(1);
}

$src = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src';
require_once $src . DIRECTORY_SEPARATOR . 'Recorder.php';
require_once $src . DIRECTORY_SEPARATOR . 'Redactor.php';
require_once $src . DIRECTORY_SEPARATOR . 'Sink' . DIRECTORY_SEPARATOR . 'NdjsonSink.php';
require_once $src . DIRECTORY_SEPARATOR . 'Db' . DIRECTORY_SEPARATOR . 'MySQLiStatement.php';
require_once $src . DIRECTORY_SEPARATOR . 'Db' . DIRECTORY_SEPARATOR . 'MySQLi.php';

use Chrysalis\Oracle\Db\MySQLi;
use Chrysalis\Oracle\Recorder;
use Chrysalis\Oracle\Redactor;
use Chrysalis\Oracle\Sink\NdjsonSink;

$host = getenv('CHRYSALIS_MYSQL_HOST') !== false && getenv('CHRYSALIS_MYSQL_HOST') !== ''
    ? (string)getenv('CHRYSALIS_MYSQL_HOST')
    : '127.0.0.1';
$port = (int)(getenv('CHRYSALIS_MYSQL_PORT') !== false && getenv('CHRYSALIS_MYSQL_PORT') !== ''
    ? (string)getenv('CHRYSALIS_MYSQL_PORT')
    : '3306');
$user = getenv('CHRYSALIS_MYSQL_USER') !== false && getenv('CHRYSALIS_MYSQL_USER') !== ''
    ? (string)getenv('CHRYSALIS_MYSQL_USER')
    : 'root';
$pass = getenv('CHRYSALIS_MYSQL_PASSWORD') !== false ? (string)getenv('CHRYSALIS_MYSQL_PASSWORD') : '';
$db = getenv('CHRYSALIS_MYSQL_DATABASE') !== false && getenv('CHRYSALIS_MYSQL_DATABASE') !== ''
    ? (string)getenv('CHRYSALIS_MYSQL_DATABASE')
    : 'test';

$mysqli = new MySQLi($host, $user, $pass, $db, $port);
for ($attempt = 0; $mysqli->connect_errno !== 0 && $attempt < 60; $attempt++) {
    sleep(2);
    $mysqli = new MySQLi($host, $user, $pass, $db, $port);
}
if ($mysqli->connect_errno !== 0) {
    fwrite(STDERR, 'mysqli connect failed after retries: ' . $mysqli->connect_error . "\n");
    exit(1);
}

$traceRoot = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'chrysalis_mysqli_smoke_' . bin2hex(random_bytes(8));
if (!@mkdir($traceRoot, 0777, true) && !is_dir($traceRoot)) {
    fwrite(STDERR, "Cannot create trace directory\n");
    exit(1);
}

$sink = new NdjsonSink($traceRoot);
$redactor = new Redactor([]);
Recorder::init($sink, $redactor);
Recorder::onRequestStart();

$res = $mysqli->query('SELECT 1 AS one');
if ($res === false) {
    fwrite(STDERR, 'query failed: ' . $mysqli->error . "\n");
    exit(1);
}
$res->free();

$stmt = $mysqli->prepare('SELECT ? AS p');
if ($stmt === false) {
    fwrite(STDERR, 'prepare failed: ' . $mysqli->error . "\n");
    exit(1);
}
$x = 42;
if (!$stmt->bind_param('i', $x)) {
    fwrite(STDERR, "bind_param failed\n");
    exit(1);
}
if (!$stmt->execute()) {
    fwrite(STDERR, 'execute failed: ' . $stmt->error . "\n");
    exit(1);
}
$r2 = $stmt->get_result();
if ($r2 === false) {
    fwrite(STDERR, "get_result() returned false (mysqlnd required for prepared SELECT capture)\n");
    exit(1);
}
$row = $r2->fetch_assoc();
if (!is_array($row) || (int)($row['p'] ?? 0) !== 42) {
    fwrite(STDERR, "unexpected prepared query row\n");
    exit(1);
}
$r2->free();
$stmt->close();
$mysqli->close();

Recorder::onRequestEnd();

$ndjsonPaths = [];
$iter = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($traceRoot, FilesystemIterator::SKIP_DOTS)
);
foreach ($iter as $fileInfo) {
    $p = $fileInfo->getPathname();
    if (str_ends_with($p, '.ndjson')) {
        $ndjsonPaths[] = $p;
    }
}
if (count($ndjsonPaths) !== 1) {
    fwrite(STDERR, 'Expected exactly one .ndjson trace file, got ' . count($ndjsonPaths) . "\n");
    exit(1);
}

$lines = file($ndjsonPaths[0], FILE_IGNORE_NEW_LINES);
if ($lines === false) {
    fwrite(STDERR, "Cannot read trace file\n");
    exit(1);
}

$mysqliSqlCount = 0;
$seenParam42 = false;
foreach ($lines as $line) {
    $ev = json_decode($line, true);
    if (!is_array($ev) || ($ev['type'] ?? '') !== 'sql.query') {
        continue;
    }
    if (($ev['driver'] ?? '') !== 'mysqli') {
        fwrite(STDERR, 'Unexpected sql.query driver: ' . ($ev['driver'] ?? '') . "\n");
        exit(1);
    }
    ++$mysqliSqlCount;
    $params = $ev['params'] ?? [];
    if (is_array($params) && isset($params[0]) && (int)$params[0] === 42) {
        $seenParam42 = true;
    }
}

if ($mysqliSqlCount < 2) {
    fwrite(STDERR, "Expected at least 2 mysqli sql.query events, got {$mysqliSqlCount}\n");
    exit(1);
}

if (!$seenParam42) {
    fwrite(STDERR, "Expected a sql.query event with bound param 42\n");
    exit(1);
}

fwrite(STDOUT, "ok\n");
exit(0);
