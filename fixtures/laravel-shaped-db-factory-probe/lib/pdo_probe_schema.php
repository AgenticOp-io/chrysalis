<?php

declare(strict_types=1);

/**
 * Shared in-memory SQLite connection for this fixture. Creates `probe_row` so
 * handler SQL (`SELECT … FROM probe_row`) matches a real table at PHP runtime.
 * Ingest only needs the SQL string; this keeps the fixture honest if executed.
 */
function chrysalis_laravel_shaped_probe_pdo(): PDO
{
    $pdo = new PDO('sqlite::memory:');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->exec('CREATE TABLE probe_row (n INTEGER NOT NULL); INSERT INTO probe_row (n) VALUES (1);');

    return $pdo;
}
