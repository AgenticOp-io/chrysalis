<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = query_one("SELECT name FROM items ORDER BY id DESC LIMIT 1");
$name = (string) ($row["name"] ?? "");

return '{"last":"' . $name . '"}';
