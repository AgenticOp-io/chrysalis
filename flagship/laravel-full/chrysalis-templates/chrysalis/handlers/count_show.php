<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT COUNT(*) AS c FROM items");
$count = (int) (($row["c"] ?? 0));
return '{"count":' . $count . '}';
