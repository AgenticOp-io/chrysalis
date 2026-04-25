<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT ROUND(AVG(id)) AS a FROM items");
$a = (int) (($row["a"] ?? 0));

return '{"avgId":' . $a . '}';
