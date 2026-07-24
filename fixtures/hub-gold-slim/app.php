<?php

declare(strict_types=1);

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

// hub-gold-slim — 20-route Slim dialect (secondary to Laravel/Symfony/plain-php ST).
// $app->get|post + {id} paths + $args + getQueryParams + withJson / write+withStatus
// (D6447 — no invented PSR-15 middleware onion). G10028 / D6490.

$app = AppFactory::create();

$app->get('/health', function (Request $request, Response $response, $args) {
    return $response->withJson(true);
});

$app->get('/ping', function (Request $request, Response $response, $args) {
    return $response->withJson(42);
});

$app->get('/version', function (Request $request, Response $response, $args) {
    return $response->withJson(1);
});

$app->get('/ready', function (Request $request, Response $response, $args) {
    return $response->withJson('ok');
});

$app->get('/count', function (Request $request, Response $response, $args) {
    return $response->withJson(3);
});

$app->get('/flag', function (Request $request, Response $response, $args) {
    return $response->withJson('chrysalis');
});

$app->get('/build', function (Request $request, Response $response, $args) {
    return $response->withJson(2026);
});

$app->get('/tier', function (Request $request, Response $response, $args) {
    return $response->withJson('gold');
});

$app->get('/meta', function (Request $request, Response $response, $args) {
    return $response->withJson(['service' => 'hub-gold-slim', 'version' => 1]);
});

$app->post('/echo', function (Request $request, Response $response, $args) {
    return $response->withJson(['echo' => true]);
});

$app->get('/items', function (Request $request, Response $response, $args) {
    return $response->withJson(true);
});

$app->get('/items/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    return $response->withJson(['id' => $id]);
});

$app->post('/items', function (Request $request, Response $response, $args) {
    return $response->withStatus(201)->withJson(['created' => true]);
});

$app->get('/search', function (Request $request, Response $response, $args) {
    $q = $request->getQueryParams()['q'] ?? '';
    return $response->withJson(['q' => $q]);
});

$app->put('/items/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    return $response->withJson(['updated' => true, 'id' => $id]);
});

$app->delete('/items/{id}', function (Request $request, Response $response, $args) {
    return $response->withJson(true);
});

$app->patch('/items/{id}', function (Request $request, Response $response, $args) {
    $id = $args['id'];
    return $response->withJson(['patched' => true, 'id' => $id]);
});

$app->get('/users/{userId}', function (Request $request, Response $response, $args) {
    $userId = $args['userId'];
    return $response->withJson($userId);
});

$app->get('/stats', function (Request $request, Response $response, $args) {
    $response->getBody()->write(json_encode(3));
    return $response->withHeader('Content-Type', 'application/json');
});

$app->post('/notify', function (Request $request, Response $response, $args) {
    $response->getBody()->write(json_encode(['ok' => true]));
    return $response->withStatus(202)->withHeader('Content-Type', 'application/json');
});
