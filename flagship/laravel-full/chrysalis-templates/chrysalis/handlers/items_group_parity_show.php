<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$rows = query_all("SELECT (id % 2) AS p, COUNT(*) AS c FROM items GROUP BY (id % 2)");
$even = 0;
$odd = 0;
foreach ($rows as $row) {
    $p = (int) (($row["p"] ?? 0));
    $c = (int) (($row["c"] ?? 0));
    if ($p === 0) {
        $even = $c;
    } else {
        $odd = $c;
    }
}

return '{"parityCounts":{"even":' . $even . ',"odd":' . $odd . '}}';
