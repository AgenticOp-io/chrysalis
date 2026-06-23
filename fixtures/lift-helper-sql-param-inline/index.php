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
require_once __DIR__ . '/lib/sql_param_strlen.php';
require_once __DIR__ . '/lib/sql_param_empty.php';
require_once __DIR__ . '/lib/sql_param_isset.php';
require_once __DIR__ . '/lib/sql_param_count.php';
require_once __DIR__ . '/lib/sql_param_is_array.php';
require_once __DIR__ . '/lib/sql_param_is_string.php';
require_once __DIR__ . '/lib/sql_param_abs.php';
require_once __DIR__ . '/lib/sql_param_is_numeric.php';
require_once __DIR__ . '/lib/sql_param_not.php';
require_once __DIR__ . '/lib/sql_param_is_int.php';
require_once __DIR__ . '/lib/sql_param_is_bool.php';
require_once __DIR__ . '/lib/sql_param_is_null.php';
require_once __DIR__ . '/lib/sql_param_neg.php';
require_once __DIR__ . '/lib/sql_param_round.php';
require_once __DIR__ . '/lib/sql_param_floor.php';
require_once __DIR__ . '/lib/sql_param_ceil.php';
require_once __DIR__ . '/lib/sql_param_strtolower.php';
require_once __DIR__ . '/lib/sql_param_strtoupper.php';
require_once __DIR__ . '/lib/sql_param_htmlspecialchars.php';
require_once __DIR__ . '/lib/sql_param_nl2br.php';
require_once __DIR__ . '/lib/sql_param_urlencode.php';
require_once __DIR__ . '/lib/sql_param_rawurlencode.php';
require_once __DIR__ . '/lib/sql_param_urldecode.php';
require_once __DIR__ . '/lib/sql_param_rawurldecode.php';
require_once __DIR__ . '/lib/sql_param_ltrim.php';
require_once __DIR__ . '/lib/sql_param_rtrim.php';
require_once __DIR__ . '/lib/sql_param_is_float.php';
require_once __DIR__ . '/lib/sql_param_is_object.php';
require_once __DIR__ . '/lib/sql_param_is_scalar.php';
require_once __DIR__ . '/lib/sql_param_round2.php';
require_once __DIR__ . '/lib/sql_param_max.php';
require_once __DIR__ . '/lib/sql_param_min.php';
require_once __DIR__ . '/lib/sql_param_substr.php';
require_once __DIR__ . '/lib/sql_param_strpos.php';
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
if ($method === 'GET' && $path === '/phi') {
    require __DIR__ . '/pages/show_phi.php';
    exit;
}
if ($method === 'GET' && $path === '/upsilon') {
    require __DIR__ . '/pages/show_upsilon.php';
    exit;
}
if ($method === 'GET' && $path === '/chi') {
    require __DIR__ . '/pages/show_chi.php';
    exit;
}
if ($method === 'GET' && $path === '/psi') {
    require __DIR__ . '/pages/show_psi.php';
    exit;
}
if ($method === 'GET' && $path === '/omega') {
    require __DIR__ . '/pages/show_omega.php';
    exit;
}
if ($method === 'GET' && $path === '/eta') {
    require __DIR__ . '/pages/show_eta.php';
    exit;
}
if ($method === 'GET' && $path === '/theta') {
    require __DIR__ . '/pages/show_theta.php';
    exit;
}
if ($method === 'GET' && $path === '/varsigma') {
    require __DIR__ . '/pages/show_varsigma.php';
    exit;
}
if ($method === 'GET' && $path === '/digamma') {
    require __DIR__ . '/pages/show_digamma.php';
    exit;
}
if ($method === 'GET' && $path === '/stigma') {
    require __DIR__ . '/pages/show_stigma.php';
    exit;
}
if ($method === 'GET' && $path === '/sampi') {
    require __DIR__ . '/pages/show_sampi.php';
    exit;
}
if ($method === 'GET' && $path === '/koppa') {
    require __DIR__ . '/pages/show_koppa.php';
    exit;
}
if ($method === 'GET' && $path === '/qoppa') {
    require __DIR__ . '/pages/show_qoppa.php';
    exit;
}
if ($method === 'GET' && $path === '/san') {
    require __DIR__ . '/pages/show_san.php';
    exit;
}
if ($method === 'GET' && $path === '/sho') {
    require __DIR__ . '/pages/show_sho.php';
    exit;
}
if ($method === 'GET' && $path === '/tsan') {
    require __DIR__ . '/pages/show_tsan.php';
    exit;
}
if ($method === 'GET' && $path === '/teth') {
    require __DIR__ . '/pages/show_teth.php';
    exit;
}
if ($method === 'GET' && $path === '/heth') {
    require __DIR__ . '/pages/show_heth.php';
    exit;
}
if ($method === 'GET' && $path === '/yodh') {
    require __DIR__ . '/pages/show_yodh.php';
    exit;
}
if ($method === 'GET' && $path === '/kaph') {
    require __DIR__ . '/pages/show_kaph.php';
    exit;
}
if ($method === 'GET' && $path === '/lamed') {
    require __DIR__ . '/pages/show_lamed.php';
    exit;
}
if ($method === 'GET' && $path === '/mem') {
    require __DIR__ . '/pages/show_mem.php';
    exit;
}
if ($method === 'GET' && $path === '/nun') {
    require __DIR__ . '/pages/show_nun.php';
    exit;
}
if ($method === 'GET' && $path === '/samekh') {
    require __DIR__ . '/pages/show_samekh.php';
    exit;
}
if ($method === 'GET' && $path === '/ayin') {
    require __DIR__ . '/pages/show_ayin.php';
    exit;
}
if ($method === 'GET' && $path === '/pe') {
    require __DIR__ . '/pages/show_pe.php';
    exit;
}
if ($method === 'GET' && $path === '/tsadi') {
    require __DIR__ . '/pages/show_tsadi.php';
    exit;
}
if ($method === 'GET' && $path === '/qof') {
    require __DIR__ . '/pages/show_qof.php';
    exit;
}
if ($method === 'GET' && $path === '/resh') {
    require __DIR__ . '/pages/show_resh.php';
    exit;
}
if ($method === 'GET' && $path === '/shin') {
    require __DIR__ . '/pages/show_shin.php';
    exit;
}
if ($method === 'GET' && $path === '/tav') {
    require __DIR__ . '/pages/show_tav.php';
    exit;
}
if ($method === 'GET' && $path === '/alef') {
    require __DIR__ . '/pages/show_alef.php';
    exit;
}
if ($method === 'GET' && $path === '/bet') {
    require __DIR__ . '/pages/show_bet.php';
    exit;
}
if ($method === 'GET' && $path === '/gimel') {
    require __DIR__ . '/pages/show_gimel.php';
    exit;
}

http_response_code(404);
echo 'Not Found';
