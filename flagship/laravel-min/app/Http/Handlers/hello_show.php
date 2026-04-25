<?php



declare(strict_types=1);



header('Content-Type: text/plain; charset=utf-8');



$name = trim((string) ($_GET['name'] ?? 'guest'));

echo 'hello:' . $name . "\n";

