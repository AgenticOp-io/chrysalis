<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT COUNT(*) AS c, MIN(id) AS min_id, MAX(id) AS max_id, SUM(id) AS sum_id FROM items");
$c = (int) (($row["c"] ?? 0));
$minId = (int) (($row["min_id"] ?? 0));
$maxId = (int) (($row["max_id"] ?? 0));
$sumId = (int) (($row["sum_id"] ?? 0));

return '{"itemsSnapshot":{"count":' . $c . ',"minId":' . $minId . ',"maxId":' . $maxId . ',"sumId":' . $sumId . '}}';
