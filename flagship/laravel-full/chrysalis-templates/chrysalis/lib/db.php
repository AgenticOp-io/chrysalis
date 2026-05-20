<?php

declare(strict_types=1);

/**
 * Minimal DB helper for Composer flagship templates.
 * Uses a deterministic SQLite path under chrysalis/data.
 */
function db_connect(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    $path = dirname(__DIR__) . "/data/app.sqlite";
    $pdo = new PDO("sqlite:" . $path);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

/**
 * @return array<string, mixed>|null
 */
function query_one(string $sql): ?array
{
    $stmt = db_connect()->query($sql);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/**
 * PDO `query` + `fetch` for flagship **`/chrysalis-pdo-count`** (D309).
 *
 * @return array<string, mixed>|null
 */
function pdo_item_count_row(): ?array
{
    $stmt = db_connect()->query("SELECT COUNT(*) AS c FROM items");
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/**
 * @return array<int, array<string, mixed>>
 */
function query_all(string $sql): array
{
    $stmt = db_connect()->query($sql);
    return $stmt->fetchAll();
}
