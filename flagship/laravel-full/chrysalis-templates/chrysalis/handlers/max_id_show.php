<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT MAX(id) AS x FROM items");
$x = (int) (($row["x"] ?? 0));

return '{"maxId":' . $x . '}';
