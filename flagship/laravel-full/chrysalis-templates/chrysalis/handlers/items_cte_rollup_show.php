<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one(
    "WITH base AS (SELECT id FROM items), stats AS (SELECT COUNT(*) AS c, SUM(id) AS s FROM base) SELECT c, s, ROUND((s * 1.0) / c) AS avg_id FROM stats",
);
$c = (int) (($row["c"] ?? 0));
$s = (int) (($row["s"] ?? 0));
$avgId = (int) (($row["avg_id"] ?? 0));

return '{"cteRollup":{"count":' . $c . ',"sumId":' . $s . ',"avgId":' . $avgId . '}}';
