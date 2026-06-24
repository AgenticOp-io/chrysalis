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
require_once __DIR__ . '/lib/sql_param_stripos.php';
require_once __DIR__ . '/lib/sql_param_strrpos.php';
require_once __DIR__ . '/lib/sql_param_strripos.php';
require_once __DIR__ . '/lib/sql_param_str_contains.php';
require_once __DIR__ . '/lib/sql_param_str_starts_with.php';
require_once __DIR__ . '/lib/sql_param_str_ends_with.php';
require_once __DIR__ . '/lib/sql_param_substr_count.php';
require_once __DIR__ . '/lib/sql_param_explode.php';
require_once __DIR__ . '/lib/sql_param_strcmp.php';
require_once __DIR__ . '/lib/sql_param_strcasecmp.php';
require_once __DIR__ . '/lib/sql_param_strncmp.php';
require_once __DIR__ . '/lib/sql_param_strncasecmp.php';
require_once __DIR__ . '/lib/sql_param_strrev.php';
require_once __DIR__ . '/lib/sql_param_str_repeat.php';
require_once __DIR__ . '/lib/sql_param_str_pad.php';
require_once __DIR__ . '/lib/sql_param_cast_float.php';
require_once __DIR__ . '/lib/sql_param_cast_bool.php';
require_once __DIR__ . '/lib/sql_param_cast_int.php';
require_once __DIR__ . '/lib/sql_param_html_entity_decode.php';
require_once __DIR__ . '/lib/sql_param_htmlentities.php';
require_once __DIR__ . '/lib/sql_param_strtr.php';
require_once __DIR__ . '/lib/sql_param_chunk_split.php';
require_once __DIR__ . '/lib/sql_param_wordwrap.php';
require_once __DIR__ . '/lib/sql_param_trim_charlist.php';
require_once __DIR__ . '/lib/sql_param_rtrim_charlist.php';
require_once __DIR__ . '/lib/sql_param_ltrim_charlist.php';
require_once __DIR__ . '/lib/sql_param_strspn.php';
require_once __DIR__ . '/lib/sql_param_strcspn.php';
require_once __DIR__ . '/lib/sql_param_str_split.php';
require_once __DIR__ . '/lib/sql_param_str_word_count.php';
require_once __DIR__ . '/lib/sql_param_str_rot13.php';
require_once __DIR__ . '/lib/sql_param_stripslashes.php';
require_once __DIR__ . '/lib/sql_param_addslashes.php';
require_once __DIR__ . '/lib/sql_param_strip_tags.php';
require_once __DIR__ . '/lib/sql_param_ucwords.php';
require_once __DIR__ . '/lib/sql_param_lcfirst.php';
require_once __DIR__ . '/lib/sql_param_ucfirst.php';
require_once __DIR__ . '/lib/sql_param_str_ireplace.php';
require_once __DIR__ . '/lib/sql_param_str_replace.php';
require_once __DIR__ . '/lib/sql_param_json_encode.php';
require_once __DIR__ . '/lib/sql_param_json_decode.php';
require_once __DIR__ . '/lib/sql_param_md5.php';
require_once __DIR__ . '/lib/sql_param_sha1.php';
require_once __DIR__ . '/lib/sql_param_base64_encode.php';
require_once __DIR__ . '/lib/sql_param_base64_decode.php';
require_once __DIR__ . '/lib/sql_param_bin2hex.php';
require_once __DIR__ . '/lib/sql_param_preg_quote.php';
require_once __DIR__ . '/lib/sql_param_parse_url.php';
require_once __DIR__ . '/lib/sql_param_basename.php';
require_once __DIR__ . '/lib/sql_param_dirname.php';
require_once __DIR__ . '/lib/sql_param_gettype.php';
require_once __DIR__ . '/lib/sql_param_is_callable.php';
require_once __DIR__ . '/lib/sql_param_is_resource.php';
require_once __DIR__ . '/lib/sql_param_ord.php';
require_once __DIR__ . '/lib/sql_param_chr.php';
require_once __DIR__ . '/lib/sql_param_preg_match.php';
require_once __DIR__ . '/lib/sql_param_hash.php';
require_once __DIR__ . '/lib/sql_param_sprintf.php';
require_once __DIR__ . '/lib/sql_param_number_format2.php';
require_once __DIR__ . '/lib/sql_param_implode.php';
require_once __DIR__ . '/lib/sql_param_preg_replace.php';
require_once __DIR__ . '/lib/sql_param_preg_split.php';
require_once __DIR__ . '/lib/sql_param_hexdec.php';
require_once __DIR__ . '/lib/sql_param_dechex.php';
require_once __DIR__ . '/lib/sql_param_filter_var.php';
require_once __DIR__ . '/lib/sql_param_crc32.php';

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
if ($method === 'GET' && $path === '/dalet') {
    require __DIR__ . '/pages/show_dalet.php';
    exit;
}
if ($method === 'GET' && $path === '/he') {
    require __DIR__ . '/pages/show_he.php';
    exit;
}
if ($method === 'GET' && $path === '/vav') {
    require __DIR__ . '/pages/show_vav.php';
    exit;
}
if ($method === 'GET' && $path === '/zayin') {
    require __DIR__ . '/pages/show_zayin.php';
    exit;
}
if ($method === 'GET' && $path === '/chet') {
    require __DIR__ . '/pages/show_chet.php';
    exit;
}
if ($method === 'GET' && $path === '/tet') {
    require __DIR__ . '/pages/show_tet.php';
    exit;
}
if ($method === 'GET' && $path === '/yod') {
    require __DIR__ . '/pages/show_yod.php';
    exit;
}
if ($method === 'GET' && $path === '/kaf') {
    require __DIR__ . '/pages/show_kaf.php';
    exit;
}
if ($method === 'GET' && $path === '/sin') {
    require __DIR__ . '/pages/show_sin.php';
    exit;
}
if ($method === 'GET' && $path === '/samech') {
    require __DIR__ . '/pages/show_samech.php';
    exit;
}
if ($method === 'GET' && $path === '/peh') {
    require __DIR__ . '/pages/show_peh.php';
    exit;
}
if ($method === 'GET' && $path === '/fe') {
    require __DIR__ . '/pages/show_fe.php';
    exit;
}
if ($method === 'GET' && $path === '/kuf') {
    require __DIR__ . '/pages/show_kuf.php';
    exit;
}
if ($method === 'GET' && $path === '/gim') {
    require __DIR__ . '/pages/show_gim.php';
    exit;
}
if ($method === 'GET' && $path === '/dale') {
    require __DIR__ . '/pages/show_dale.php';
    exit;
}

if ($method === 'GET' && $path === '/repl') {
    require __DIR__ . '/pages/show_repl.php';
    exit;
}
if ($method === 'GET' && $path === '/irepl') {
    require __DIR__ . '/pages/show_irepl.php';
    exit;
}
if ($method === 'GET' && $path === '/ucf') {
    require __DIR__ . '/pages/show_ucf.php';
    exit;
}
if ($method === 'GET' && $path === '/lcf') {
    require __DIR__ . '/pages/show_lcf.php';
    exit;
}
if ($method === 'GET' && $path === '/ucw') {
    require __DIR__ . '/pages/show_ucw.php';
    exit;
}
if ($method === 'GET' && $path === '/stag') {
    require __DIR__ . '/pages/show_stag.php';
    exit;
}
if ($method === 'GET' && $path === '/adds') {
    require __DIR__ . '/pages/show_adds.php';
    exit;
}
if ($method === 'GET' && $path === '/subs') {
    require __DIR__ . '/pages/show_subs.php';
    exit;
}
if ($method === 'GET' && $path === '/rot13') {
    require __DIR__ . '/pages/show_rot13.php';
    exit;
}
if ($method === 'GET' && $path === '/swc') {
    require __DIR__ . '/pages/show_swc.php';
    exit;
}
if ($method === 'GET' && $path === '/split') {
    require __DIR__ . '/pages/show_split.php';
    exit;
}
if ($method === 'GET' && $path === '/cspn') {
    require __DIR__ . '/pages/show_cspn.php';
    exit;
}
if ($method === 'GET' && $path === '/sspn') {
    require __DIR__ . '/pages/show_sspn.php';
    exit;
}
if ($method === 'GET' && $path === '/ltrimc') {
    require __DIR__ . '/pages/show_ltrimc.php';
    exit;
}
if ($method === 'GET' && $path === '/rtrimc') {
    require __DIR__ . '/pages/show_rtrimc.php';
    exit;
}
if ($method === 'GET' && $path === '/trimc') {
    require __DIR__ . '/pages/show_trimc.php';
    exit;
}
if ($method === 'GET' && $path === '/wrap') {
    require __DIR__ . '/pages/show_wrap.php';
    exit;
}
if ($method === 'GET' && $path === '/csplit') {
    require __DIR__ . '/pages/show_csplit.php';
    exit;
}
if ($method === 'GET' && $path === '/xlat') {
    require __DIR__ . '/pages/show_xlat.php';
    exit;
}
if ($method === 'GET' && $path === '/hent') {
    require __DIR__ . '/pages/show_hent.php';
    exit;
}
if ($method === 'GET' && $path === '/hdec') {
    require __DIR__ . '/pages/show_hdec.php';
    exit;
}
if ($method === 'GET' && $path === '/m76') {
    require __DIR__ . '/pages/show_m76.php';
    exit;
}
if ($method === 'GET' && $path === '/m77') {
    require __DIR__ . '/pages/show_m77.php';
    exit;
}
if ($method === 'GET' && $path === '/m78') {
    require __DIR__ . '/pages/show_m78.php';
    exit;
}
if ($method === 'GET' && $path === '/m79') {
    require __DIR__ . '/pages/show_m79.php';
    exit;
}
if ($method === 'GET' && $path === '/m80') {
    require __DIR__ . '/pages/show_m80.php';
    exit;
}
if ($method === 'GET' && $path === '/m81') {
    require __DIR__ . '/pages/show_m81.php';
    exit;
}
if ($method === 'GET' && $path === '/m82') {
    require __DIR__ . '/pages/show_m82.php';
    exit;
}
if ($method === 'GET' && $path === '/m83') {
    require __DIR__ . '/pages/show_m83.php';
    exit;
}
if ($method === 'GET' && $path === '/m84') {
    require __DIR__ . '/pages/show_m84.php';
    exit;
}
if ($method === 'GET' && $path === '/m85') {
    require __DIR__ . '/pages/show_m85.php';
    exit;
}
if ($method === 'GET' && $path === '/m86') {
    require __DIR__ . '/pages/show_m86.php';
    exit;
}
if ($method === 'GET' && $path === '/m87') {
    require __DIR__ . '/pages/show_m87.php';
    exit;
}
if ($method === 'GET' && $path === '/m88') {
    require __DIR__ . '/pages/show_m88.php';
    exit;
}
if ($method === 'GET' && $path === '/m89') {
    require __DIR__ . '/pages/show_m89.php';
    exit;
}
if ($method === 'GET' && $path === '/m90') {
    require __DIR__ . '/pages/show_m90.php';
    exit;
}
if ($method === 'GET' && $path === '/m91') {
    require __DIR__ . '/pages/show_m91.php';
    exit;
}
if ($method === 'GET' && $path === '/m92') {
    require __DIR__ . '/pages/show_m92.php';
    exit;
}
if ($method === 'GET' && $path === '/m93') {
    require __DIR__ . '/pages/show_m93.php';
    exit;
}
if ($method === 'GET' && $path === '/m94') {
    require __DIR__ . '/pages/show_m94.php';
    exit;
}
if ($method === 'GET' && $path === '/m95') {
    require __DIR__ . '/pages/show_m95.php';
    exit;
}
if ($method === 'GET' && $path === '/m96') {
    require __DIR__ . '/pages/show_m96.php';
    exit;
}
if ($method === 'GET' && $path === '/m97') {
    require __DIR__ . '/pages/show_m97.php';
    exit;
}
if ($method === 'GET' && $path === '/m98') {
    require __DIR__ . '/pages/show_m98.php';
    exit;
}
if ($method === 'GET' && $path === '/m99') {
    require __DIR__ . '/pages/show_m99.php';
    exit;
}
if ($method === 'GET' && $path === '/m100') {
    require __DIR__ . '/pages/show_m100.php';
    exit;
}
if ($method === 'GET' && $path === '/m101') {
    require __DIR__ . '/pages/show_m101.php';
    exit;
}
if ($method === 'GET' && $path === '/m102') {
    require __DIR__ . '/pages/show_m102.php';
    exit;
}
if ($method === 'GET' && $path === '/m103') {
    require __DIR__ . '/pages/show_m103.php';
    exit;
}
http_response_code(404);
echo 'Not Found';
