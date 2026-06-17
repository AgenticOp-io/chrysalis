<?php

require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/sql_param.php';
require_once __DIR__ . '/lib/sql_param_local.php';
require_once __DIR__ . '/lib/sql_param_chain.php';
require_once __DIR__ . '/lib/sql_param_noinline.php';
require_once __DIR__ . '/lib/sql_param_prelude.php';
require_once __DIR__ . '/lib/sql_param_sideeffect.php';
require_once __DIR__ . '/lib/sql_param_literal.php';
require_once __DIR__ . '/lib/sql_param_cast.php';
require_once __DIR__ . '/lib/sql_param_coalesce.php';
require_once __DIR__ . '/lib/sql_param_strval.php';
require_once __DIR__ . '/lib/sql_param_cast_string.php';
require_once __DIR__ . '/lib/sql_param_bool.php';
require_once __DIR__ . '/lib/sql_param_float.php';
require_once __DIR__ . '/lib/sql_param_trim.php';
require_once __DIR__ . '/lib/sql_param_cast_float.php';
require_once __DIR__ . '/lib/sql_param_cast_bool.php';
require_once __DIR__ . '/lib/sql_param_cast_int.php';

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
if ($method === 'GET' && $path === '/kappa') {
    require __DIR__ . '/pages/show_kappa.php';
    exit;
}
if ($method === 'GET' && $path === '/lambda') {
    require __DIR__ . '/pages/show_lambda.php';
    exit;
}
if ($method === 'GET' && $path === '/mu') {
    require __DIR__ . '/pages/show_mu.php';
    exit;
}
if ($method === 'GET' && $path === '/nu') {
    require __DIR__ . '/pages/show_nu.php';
    exit;
}
if ($method === 'GET' && $path === '/xi') {
    require __DIR__ . '/pages/show_xi.php';
    exit;
}
if ($method === 'GET' && $path === '/omicron') {
    require __DIR__ . '/pages/show_omicron.php';
    exit;
}
if ($method === 'GET' && $path === '/pi') {
    require __DIR__ . '/pages/show_pi.php';
    exit;
}
if ($method === 'GET' && $path === '/rho') {
    require __DIR__ . '/pages/show_rho.php';
    exit;
}
if ($method === 'GET' && $path === '/sigma') {
    require __DIR__ . '/pages/show_sigma.php';
    exit;
}
if ($method === 'GET' && $path === '/tau') {
    require __DIR__ . '/pages/show_tau.php';
    exit;
}

http_response_code(404);
echo 'Not Found';
