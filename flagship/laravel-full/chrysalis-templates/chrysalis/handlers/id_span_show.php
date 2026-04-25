<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT (MAX(id) - MIN(id)) AS s FROM items");
$s = (int) (($row["s"] ?? 0));

return '{"idSpan":' . $s . '}';
