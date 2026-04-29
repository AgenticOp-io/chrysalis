<?php

declare(strict_types=1);

namespace ChrysalisProbe;

/** Third manifest callee (`Repo::db`); uses shared probe schema. */
final class Repo
{
    public static function db(): \PDO
    {
        require_once dirname(__DIR__) . '/pdo_probe_schema.php';

        return chrysalis_laravel_shaped_probe_pdo();
    }
}
