<?php
// tiny-blog — front controller. Procedural, no framework. On purpose.

session_start();
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$path   = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Very small ad-hoc router. Legacy code loves this shape.
if ($method === 'GET' && $path === '/posts') {
    require __DIR__ . '/pages/posts_list.php';
    exit;
}

if ($method === 'GET' && preg_match('#^/posts/(\d+)$#', $path, $m)) {
    $post_id = (int)$m[1];
    require __DIR__ . '/pages/posts_view.php';
    exit;
}

if ($method === 'POST' && $path === '/login') {
    require __DIR__ . '/pages/login.php';
    exit;
}

if ($method === 'POST' && $path === '/posts') {
    require __DIR__ . '/pages/posts_create.php';
    exit;
}

if ($method === 'POST' && preg_match('#^/posts/(\d+)/comments$#', $path, $m)) {
    $post_id = (int)$m[1];
    require __DIR__ . '/pages/comments_create.php';
    exit;
}

http_response_code(404);
echo "Not Found";
