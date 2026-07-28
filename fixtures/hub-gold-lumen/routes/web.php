<?php

/**
 * hub-gold-lumen — 20-route Lumen / Laravel-router dialect
 * (secondary to Laravel min / Symfony / plain-php ST).
 * $router->get|post + {id} path args + $request->query + response()->json
 * (D6447 — no invented middleware / cross-file controllers). G10049 / D6511.
 *
 * @var \Laravel\Lumen\Routing\Router $router
 */

use Illuminate\Http\Request;

$router->get('/health', function () {
    return response()->json(true);
});

$router->get('/ping', function () {
    return response()->json(42);
});

$router->get('/version', function () {
    return response()->json(1);
});

$router->get('/ready', function () {
    return response()->json('ok');
});

$router->get('/count', function () {
    return response()->json(3);
});

$router->get('/flag', function () {
    return response()->json('chrysalis');
});

$router->get('/build', function () {
    return response()->json(2026);
});

$router->get('/tier', function () {
    return response()->json('gold');
});

$router->get('/meta', function () {
    return response()->json(['service' => 'hub-gold-lumen', 'version' => 1]);
});

$router->post('/echo', function () {
    return response()->json(['echo' => true]);
});

$router->get('/items', function () {
    return response()->json(true);
});

$router->get('/items/{id}', function ($id) {
    return response()->json(['id' => $id]);
});

$router->post('/items', function () {
    return response()->json(['created' => true], 201);
});

$router->get('/search', function (Request $request) {
    $q = $request->query('q', '');
    return response()->json(['q' => $q]);
});

$router->put('/items/{id}', function ($id) {
    return response()->json(['updated' => true, 'id' => $id]);
});

$router->delete('/items/{id}', function ($id) {
    return response()->json(true);
});

$router->patch('/items/{id}', function ($id) {
    return response()->json(['patched' => true, 'id' => $id]);
});

$router->get('/users/{userId}', function ($userId) {
    return response()->json($userId);
});

$router->get('/stats', function () {
    return response()->json(3);
});

$router->post('/notify', function () {
    return response()->json(['ok' => true], 202);
});
