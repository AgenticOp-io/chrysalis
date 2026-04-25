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

Route::get("/chrysalis-first-item", function () {
    $body = require base_path("chrysalis/handlers/first_item_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-last-item", function () {
    $body = require base_path("chrysalis/handlers/last_item_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-items", function () {
    $body = require base_path("chrysalis/handlers/items_list_show.php");
    return response((string) $body, 200, ["Content-Type" => "text/plain; charset=utf-8"]);
});

Route::get("/chrysalis-lib-count", function () {
    $body = require base_path("chrysalis/handlers/lib_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-sum-ids", function () {
    $body = require base_path("chrysalis/handlers/sum_ids_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-min-id", function () {
    $body = require base_path("chrysalis/handlers/min_id_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-max-id", function () {
    $body = require base_path("chrysalis/handlers/max_id_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-avg-id", function () {
    $body = require base_path("chrysalis/handlers/avg_id_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-id-span", function () {
    $body = require base_path("chrysalis/handlers/id_span_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-sum-squares", function () {
    $body = require base_path("chrysalis/handlers/sum_squares_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-even-count", function () {
    $body = require base_path("chrysalis/handlers/even_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-odd-count", function () {
    $body = require base_path("chrysalis/handlers/odd_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-gt-two-count", function () {
    $body = require base_path("chrysalis/handlers/gt_two_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-lt-three-count", function () {
    $body = require base_path("chrysalis/handlers/lt_three_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-gte-two-count", function () {
    $body = require base_path("chrysalis/handlers/gte_two_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-lte-three-count", function () {
    $body = require base_path("chrysalis/handlers/lte_three_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-ne-two-count", function () {
    $body = require base_path("chrysalis/handlers/ne_two_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-between-count", function () {
    $body = require base_path("chrysalis/handlers/between_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-eq-one-count", function () {
    $body = require base_path("chrysalis/handlers/eq_one_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-eq-three-count", function () {
    $body = require base_path("chrysalis/handlers/eq_three_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-eq-two-count", function () {
    $body = require base_path("chrysalis/handlers/eq_two_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-ne-one-count", function () {
    $body = require base_path("chrysalis/handlers/ne_one_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-ne-three-count", function () {
    $body = require base_path("chrysalis/handlers/ne_three_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-lt-two-count", function () {
    $body = require base_path("chrysalis/handlers/lt_two_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-gt-one-count", function () {
    $body = require base_path("chrysalis/handlers/gt_one_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-gte-one-count", function () {
    $body = require base_path("chrysalis/handlers/gte_one_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
});

Route::get("/chrysalis-lte-one-count", function () {
    $body = require base_path("chrysalis/handlers/lte_one_count_show.php");
    return response((string) $body, 200, ["Content-Type" => "application/json; charset=utf-8"]);
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
