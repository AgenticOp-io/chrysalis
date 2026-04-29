<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * Thin wrapper so routes can use a static factory; ingest only tracks the return
 * as a DB receiver when `DbFactory::getConnection` is listed in `chrysalis.routes.json`.
 */
final class DbFactory
{
    public static function getConnection(): mysqli
    {
        return db();
    }
}
