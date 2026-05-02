<?php
// Minimal front controller: two GET routes for D282 CLI / ingest coverage.

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method === 'GET' && $path === '/a') {
    require __DIR__ . '/pages/twin_a.php';
    exit;
}

if ($method === 'GET' && $path === '/b') {
    require __DIR__ . '/pages/twin_b.php';
    exit;
}

http_response_code(404);
echo "Not Found";
