<?php

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/sql_param.php';
require_once __DIR__ . '/lib/sql_param_local.php';
require_once __DIR__ . '/lib/sql_param_chain.php';
require_once __DIR__ . '/lib/sql_param_noinline.php';
require_once __DIR__ . '/lib/sql_param_prelude.php';
require_once __DIR__ . '/lib/sql_param_sideeffect.php';
require_once __DIR__ . '/lib/sql_param_literal.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($method === 'GET' && $path === '/alpha') {
    require __DIR__ . '/pages/show_alpha.php';
    exit;
}
if ($method === 'GET' && $path === '/beta') {
    require __DIR__ . '/pages/show_beta.php';
    exit;
}
if ($method === 'GET' && $path === '/gamma') {
    require __DIR__ . '/pages/show_gamma.php';
    exit;
}
if ($method === 'GET' && $path === '/delta') {
    require __DIR__ . '/pages/show_delta.php';
    exit;
}
if ($method === 'GET' && $path === '/epsilon') {
    require __DIR__ . '/pages/show_epsilon.php';
    exit;
}
if ($method === 'GET' && $path === '/zeta') {
    require __DIR__ . '/pages/show_zeta.php';
    exit;
}
if ($method === 'GET' && $path === '/iota') {
    require __DIR__ . '/pages/show_iota.php';
    exit;
}

http_response_code(404);
echo 'Not Found';
