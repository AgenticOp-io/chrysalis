<?php

require_once dirname(__DIR__, 3) . '/lib/db.php';

header('Content-Type: text/plain; charset=utf-8');
$row = query_one('SELECT COUNT(*) AS c FROM items');
$c = $row !== null && isset($row['c']) ? (int) $row['c'] : 0;
echo (string) $c . "\n";
