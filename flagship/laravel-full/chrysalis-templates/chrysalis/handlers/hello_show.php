<?php

declare(strict_types=1);

$name = trim((string) ($_GET["name"] ?? "world"));
return "hello " . $name . "\n";
