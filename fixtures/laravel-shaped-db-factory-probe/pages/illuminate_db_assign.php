<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/Illuminate/Support/Facades/DB.php';

$c = \Illuminate\Support\Facades\DB::connection();
$c->query('SELECT 1 AS n FROM probe_row LIMIT 1');
