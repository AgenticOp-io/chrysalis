<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

/**
 * Bounded framework-service wrapper: keep explicit Chrysalis handler ownership
 * while exercising Laravel's response factory through the service container.
 */
function chrysalisFrameworkJson(string $body)
{
    $factory = app(\Illuminate\Contracts\Routing\ResponseFactory::class);
    return $factory->make($body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
}

Route::get("/chrysalis-ping", function () {
    $body = require base_path("chrysalis/handlers/ping_show.php");
    return response((string) $body, 200, ["Content-Type" => "text/plain; charset=utf-8"]);
});

Route::get("/chrysalis-health.txt", function () {
    $body = require base_path("chrysalis/handlers/health_txt_show.php");
    return response((string) $body, 200, ["Content-Type" => "text/plain; charset=utf-8"]);
});

Route::get("/api/chrysalis-health", function () {
    $body = require base_path("chrysalis/handlers/api_health_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-jump", function () {
    require base_path("chrysalis/handlers/jump_show.php");
    return redirect("/chrysalis-health.txt", 302);
});

Route::get("/chrysalis-session/visit", function () {
    $body = require base_path("chrysalis/handlers/session_visit_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-hello", function () {
    $body = require base_path("chrysalis/handlers/hello_show.php");
    return response((string) $body, 200, ["Content-Type" => "text/plain; charset=utf-8"]);
});

Route::get("/chrysalis-count", function () {
    $body = require base_path("chrysalis/handlers/count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-session/me", function () {
    $body = require base_path("chrysalis/handlers/session_me_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-framework", function () {
    $body = require base_path("chrysalis/handlers/framework_show.php");
    return chrysalisFrameworkJson((string) $body);
});

Route::post("/chrysalis-session/login", function () {
    $body = require base_path("chrysalis/handlers/session_login_post.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::post("/chrysalis-session/logout", function () {
    $body = require base_path("chrysalis/handlers/session_logout_post.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::post("/chrysalis-echo", function () {
    $body = require base_path("chrysalis/handlers/echo_post.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});
