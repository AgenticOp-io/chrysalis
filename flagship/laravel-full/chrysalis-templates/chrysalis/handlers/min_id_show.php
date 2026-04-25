<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT MIN(id) AS m FROM items");
$m = (int) (($row["m"] ?? 0));

return '{"minId":' . $m . '}';
