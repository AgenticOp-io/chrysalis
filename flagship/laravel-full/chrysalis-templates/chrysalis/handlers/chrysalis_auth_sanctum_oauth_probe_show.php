<?php

declare(strict_types=1);

require_once dirname(__DIR__) . "/lib/auth_sanctum_oauth_probe_stubs.php";

$sanctum = \Laravel\Sanctum\NewAccessToken::probe();
$oauth = \League\OAuth2\Client\GenericProvider::probe();

return json_encode(
    [
        "sanctum" => $sanctum,
        "oauth" => $oauth,
    ],
);
