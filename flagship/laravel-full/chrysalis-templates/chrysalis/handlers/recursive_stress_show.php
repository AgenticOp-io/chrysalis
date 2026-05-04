<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one(
    "WITH RECURSIVE seq(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM seq WHERE n < (SELECT COUNT(*) * 10 FROM items)) SELECT MAX(n) AS max_n, SUM(n) AS sum_n FROM seq",
);
$maxN = (int) (($row["max_n"] ?? 0));
$sumN = (int) (($row["sum_n"] ?? 0));

return '{"recursiveStress":{"maxN":' . $maxN . ',"sumN":' . $sumN . '}}';
