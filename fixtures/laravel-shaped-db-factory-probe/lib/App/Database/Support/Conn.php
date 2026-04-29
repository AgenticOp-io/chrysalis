<?php

declare(strict_types=1);

namespace App\Database\Support;

/** Minimal app factory; manifest lists `Conn::make`. */
final class Conn
{
    public static function make(): \PDO
    {
        require_once dirname(__DIR__, 3) . '/pdo_probe_schema.php';

        return chrysalis_laravel_shaped_probe_pdo();
    }
}
