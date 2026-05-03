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

if ($method === 'POST' && $path === '/echo') {
    require dirname(__DIR__) . '/app/Http/Handlers/echo_post.php';
    exit;
}

if ($method === 'GET' && $path === '/login') {
    require dirname(__DIR__) . '/app/Http/Handlers/login_form_show.php';
    exit;
}

if ($method === 'POST' && $path === '/login') {
    require dirname(__DIR__) . '/app/Http/Handlers/login_post.php';
    exit;
}

if ($method === 'POST' && $path === '/logout') {
    require dirname(__DIR__) . '/app/Http/Handlers/logout_post.php';
    exit;
}

if ($method === 'GET' && $path === '/hello') {
    require dirname(__DIR__) . '/app/Http/Handlers/hello_show.php';
    exit;
}

if ($method === 'GET' && $path === '/') {
    require dirname(__DIR__) . '/app/Http/Handlers/home_show.php';
    exit;
}

if ($method === 'GET' && $path === '/jump') {
    require dirname(__DIR__) . '/app/Http/Handlers/jump_show.php';
    exit;
}

if ($method === 'GET' && $path === '/health') {
    require dirname(__DIR__) . '/app/Http/Handlers/health_show.php';
    exit;
}

if ($method === 'GET' && $path === '/api/health') {
    require dirname(__DIR__) . '/app/Http/Handlers/api_health_show.php';
    exit;
}

if ($method === 'GET' && $path === '/robots.txt') {
    require dirname(__DIR__) . '/app/Http/Handlers/robots_show.php';
    exit;
}

if ($method === 'GET' && $path === '/humans.txt') {
    require dirname(__DIR__) . '/app/Http/Handlers/humans_show.php';
    exit;
}

if ($method === 'GET' && $path === '/.well-known/security.txt') {
    require dirname(__DIR__) . '/app/Http/Handlers/security_txt_show.php';
    exit;
}

if ($method === 'GET' && $path === '/sitemap.xml') {
    require dirname(__DIR__) . '/app/Http/Handlers/sitemap_xml_show.php';
    exit;
}

if ($method === 'GET' && $path === '/css/pilot.css') {
    require dirname(__DIR__) . '/app/Http/Handlers/pilot_css_show.php';
    exit;
}

if ($method === 'GET' && $path === '/manifest.webmanifest') {
    require dirname(__DIR__) . '/app/Http/Handlers/manifest_show.php';
    exit;
}

if ($method === 'GET' && $path === '/items') {
    require dirname(__DIR__) . '/app/Http/Handlers/items_list.php';
    exit;
}

if ($method === 'GET' && $path === '/count') {
    require dirname(__DIR__) . '/app/Http/Handlers/items_count.php';
    exit;
}

if ($method === 'GET' && $path === '/session/visit') {
    require dirname(__DIR__) . '/app/Http/Handlers/session_visit_show.php';
    exit;
}

if ($method === 'GET' && $path === '/session/me') {
    require dirname(__DIR__) . '/app/Http/Handlers/session_me_show.php';
    exit;
}

if ($method === 'GET' && $path === '/gate-probe') {
    require dirname(__DIR__) . '/app/Http/Handlers/gate_probe_show.php';
    exit;
}

http_response_code(404);
header('Content-Type: text/plain; charset=utf-8');
echo 'Not Found';
