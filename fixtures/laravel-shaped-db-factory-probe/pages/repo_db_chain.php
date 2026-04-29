<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/ChrysalisProbe/Repo.php';

\ChrysalisProbe\Repo::db()->query('SELECT 1 AS n FROM probe_row LIMIT 1');
