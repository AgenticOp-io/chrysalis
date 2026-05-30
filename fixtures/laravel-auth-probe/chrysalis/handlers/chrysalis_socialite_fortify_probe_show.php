<?php

declare(strict_types=1);

require_once dirname(__DIR__) . "/lib/socialite_fortify_probe_stubs.php";

$socialite = \Laravel\Socialite\Facades\Socialite::probe();
$fortify = \Laravel\Fortify\Fortify::probe();

return json_encode(
    [
        "socialite" => $socialite,
        "fortify" => $fortify,
    ],
);
