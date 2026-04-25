<?php

/**
 * PDO to the flagship SQLite file (oracle-instrumented when the prelude is active).
 */
function laravel_min_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $path = dirname(__DIR__) . '/data/app.sqlite';
    $dsn = 'sqlite:' . $path;
    if (class_exists('\\Chrysalis\\Oracle\\Db\\PDO')) {
        $pdo = new \Chrysalis\Oracle\Db\PDO($dsn);
    } else {
        $pdo = new PDO($dsn);
    }
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    return $pdo;
}

function query_all(string $sql, array $params = []): array
{
    $stmt = laravel_min_db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function query_one(string $sql, array $params = []): ?array
{
    $stmt = laravel_min_db()->prepare($sql);
    $stmt->execute($params);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function exec_sql(string $sql, array $params = []): int
{
    $stmt = laravel_min_db()->prepare($sql);
    $stmt->execute($params);
    return (int) laravel_min_db()->lastInsertId();
}
