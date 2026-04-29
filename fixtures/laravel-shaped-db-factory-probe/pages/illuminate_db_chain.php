<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/Illuminate/Support/Facades/DB.php';

\Illuminate\Support\Facades\DB::connection()->query('SELECT 1 AS n FROM probe_row LIMIT 1');
