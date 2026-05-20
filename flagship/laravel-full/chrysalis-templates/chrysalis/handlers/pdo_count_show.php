<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$stmt = db_connect()->query("SELECT COUNT(*) AS c FROM items");
$row = $stmt->fetch();
$c = (int) (($row["c"] ?? 0));

return '{"countViaPdo":' . $c . '}';
