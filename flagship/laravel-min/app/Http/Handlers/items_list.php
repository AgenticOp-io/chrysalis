<?php

require_once dirname(__DIR__, 3) . '/lib/db.php';

header('Content-Type: text/plain; charset=utf-8');
$rows = query_all('SELECT id, name FROM items ORDER BY id ASC');
foreach ($rows as $row) {
    echo (int) $row['id'] . ':' . $row['name'] . "\n";
}
