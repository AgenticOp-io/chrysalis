<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$rows = query_all("SELECT id, name FROM items ORDER BY id ASC");
$out = "";
foreach ($rows as $row) {
    $out .= (string) (int) ($row["id"] ?? 0) . ":" . (string) ($row["name"] ?? "") . "\n";
}

return $out;
