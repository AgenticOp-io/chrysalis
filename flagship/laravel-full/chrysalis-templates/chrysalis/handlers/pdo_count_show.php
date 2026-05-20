<?php

declare(strict_types=1);

require __DIR__ . "/../lib/db.php";

$row = pdo_item_count_row();
$c = (int) (($row["c"] ?? 0));

return '{"countViaPdo":' . $c . '}';
