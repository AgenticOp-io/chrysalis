<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT SUM(id * id) AS ss FROM items");
$ss = (int) (($row["ss"] ?? 0));

return '{"sumSquares":' . $ss . '}';
