<?php
// Minimal PDO helpers for sql-same-twin effect probes (file-backed for oracle capture).

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'sqlite:' . __DIR__ . '/../probe.sqlite';
        $pdo = class_exists('\\Chrysalis\\Oracle\\Db\\PDO')
            ? new \Chrysalis\Oracle\Db\PDO($dsn)
            : new PDO($dsn);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    }
    return $pdo;
}

function query_all(string $sql, array $params = []): array
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}
