<?php
/**
 * Front controller — roughly where Laravel's `public/index.php` would live.
 * Used for manual `php -S localhost:8080 -t public` smoke tests; Chrysalis
 * ingest is driven by `chrysalis.routes.json`, not this file.
 */
$vendorAutoload = dirname(__DIR__) . '/vendor/autoload.php';
if (is_file($vendorAutoload)) {
    require $vendorAutoload;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

if ($method === 'GET' && $path === '/') {
    require dirname(__DIR__) . '/app/Http/Handlers/home_show.php';
    exit;
}

if ($method === 'GET' && $path === '/health') {
    require dirname(__DIR__) . '/app/Http/Handlers/health_show.php';
    exit;
}

if ($method === 'GET' && $path === '/items') {
    require dirname(__DIR__) . '/app/Http/Handlers/items_list.php';
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not Found';
