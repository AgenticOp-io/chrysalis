<?php

declare(strict_types=1);

namespace Illuminate\Support\Facades;

/**
 * Minimal class mirroring `Illuminate\Support\Facades\DB::connection()` for
 * parser + ingest. Not a Laravel install — only this file and `pdo_probe_schema.php`.
 * Listed in `chrysalis.routes.json` `dbFactoryReturnCallees`.
 */
final class DB
{
    public static function connection(): \PDO
    {
        require_once dirname(__DIR__, 3) . '/pdo_probe_schema.php';

        return chrysalis_laravel_shaped_probe_pdo();
    }
}
