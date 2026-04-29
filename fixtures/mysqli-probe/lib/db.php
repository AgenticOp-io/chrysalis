<?php

declare(strict_types=1);

/**
 * mysqli-backed helpers mirroring fixtures/tiny-blog/lib/db.php call sites.
 * Ingest lowers query_all / query_one / exec_sql the same way as the PDO fixture;
 * runtime uses mysqli (optionally Chrysalis Oracle Db\MySQLi when the prelude is loaded).
 */

function db(): mysqli
{
    static $mysqli = null;
    if ($mysqli === null) {
        $host = getenv('MYSQL_HOST') ?: '127.0.0.1';
        $user = getenv('MYSQL_USER') ?: 'root';
        $pass = getenv('MYSQL_PASSWORD') ?: '';
        $database = getenv('MYSQL_DATABASE') ?: 'test';
        $port = (int)(getenv('MYSQL_PORT') ?: '3306');
        $mysqli = class_exists('\\Chrysalis\\Oracle\\Db\\MySQLi')
            ? new \Chrysalis\Oracle\Db\MySQLi($host, $user, $pass, $database, $port)
            : new mysqli($host, $user, $pass, $database, $port);
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    }
    return $mysqli;
}

function query_all(string $sql, array $params = []): array
{
    $stmt = db()->prepare($sql);
    if ($stmt === false) {
        throw new RuntimeException('prepare failed');
    }
    $ok = $params === [] ? $stmt->execute() : $stmt->execute($params);
    if (!$ok) {
        throw new RuntimeException('execute failed');
    }
    $res = $stmt->get_result();
    if ($res === false) {
        return [];
    }
    return $res->fetch_all(MYSQLI_ASSOC);
}

function query_one(string $sql, array $params = []): ?array
{
    $stmt = db()->prepare($sql);
    if ($stmt === false) {
        throw new RuntimeException('prepare failed');
    }
    $ok = $params === [] ? $stmt->execute() : $stmt->execute($params);
    if (!$ok) {
        throw new RuntimeException('execute failed');
    }
    $res = $stmt->get_result();
    if ($res === false) {
        return null;
    }
    $row = $res->fetch_assoc();
    return $row === null ? null : $row;
}

function exec_sql(string $sql, array $params = []): int
{
    $stmt = db()->prepare($sql);
    if ($stmt === false) {
        throw new RuntimeException('prepare failed');
    }
    if ($params === []) {
        $stmt->execute();
    } else {
        $stmt->execute($params);
    }
    return (int)db()->insert_id;
}
