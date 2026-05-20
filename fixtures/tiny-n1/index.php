<?php

require_once __DIR__ . '/lib/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method === 'GET' && $path === '/dashboard') {
    require __DIR__ . '/pages/dashboard.php';
    exit;
}
if ($method === 'POST' && $path === '/register') {
    require __DIR__ . '/pages/register.php';
    exit;
}
if ($method === 'POST' && $path === '/action') {
    require __DIR__ . '/pages/action.php';
    exit;
}
if ($method === 'GET' && $path === '/search') {
    require __DIR__ . '/pages/search.php';
    exit;
}
if ($method === 'GET' && $path === '/lookup') {
    require __DIR__ . '/pages/lookup.php';
    exit;
}

http_response_code(404);
echo 'Not Found';
