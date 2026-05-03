<?php

require_once dirname(__DIR__, 3) . '/lib/db.php';

header('Content-Type: text/plain; charset=utf-8');
$row = query_one('SELECT COUNT(*) AS cnt FROM items');
$cnt = $row !== null && isset($row['cnt']) ? (int) $row['cnt'] : 0;
echo (string) $cnt . "\n";
