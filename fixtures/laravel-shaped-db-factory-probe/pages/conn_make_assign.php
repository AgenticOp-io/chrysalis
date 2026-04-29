<?php

declare(strict_types=1);

require_once __DIR__ . '/../lib/App/Database/Support/Conn.php';

$x = \App\Database\Support\Conn::make();
$x->query('SELECT 1 AS n FROM probe_row LIMIT 1');
