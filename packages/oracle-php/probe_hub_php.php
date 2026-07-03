<?php

declare(strict_types=1);

/**
 * Probe a generated PHP hub router in-process (hub_handle_request).
 * Prints JSON to stdout.
 */
function concrete_path(string $path): string
{
    $path = preg_replace('/:([A-Za-z_][A-Za-z0-9_]*)/', '1', $path) ?? $path;
    $path = preg_replace('/\{([A-Za-z_][A-Za-z0-9_]*)\}/', '1', $path) ?? $path;
    return preg_replace('/<([A-Za-z_][A-Za-z0-9_]*)>/', '1', $path) ?? $path;
}

$fixture = $argv[1] ?? '.';
$routesPath = rtrim($fixture, '/\\') . DIRECTORY_SEPARATOR . 'chrysalis.oracle-probe-routes.json';
$indexPath = rtrim($fixture, '/\\') . DIRECTORY_SEPARATOR . 'generated' . DIRECTORY_SEPARATOR . 'php' . DIRECTORY_SEPARATOR . 'index.php';
if (!is_file($routesPath)) {
    fwrite(STDERR, json_encode(['ok' => false, 'error' => 'missing-probe-routes']));
    exit(1);
}
if (!is_file($indexPath)) {
    fwrite(STDERR, json_encode(['ok' => false, 'error' => 'missing-generated-index']));
    exit(1);
}
putenv('CHRYSALIS_HUB_PHP_PROBE=1');
require $indexPath;
$spec = json_decode(file_get_contents($routesPath), true, 512, JSON_THROW_ON_ERROR);
$routes = $spec['routes'] ?? [];
$results = [];
foreach ($routes as $route) {
    $method = strtoupper((string) ($route['method'] ?? 'GET'));
    $path = concrete_path((string) ($route['path'] ?? '/'));
    try {
        $result = hub_handle_request($method, $path);
        $results[] = [
            'method' => $method,
            'path' => $path,
            'status' => $result['status'] ?? 500,
            'body' => $result['body'] ?? '',
            'headers' => $result['headers'] ?? [],
        ];
    } catch (Throwable $e) {
        $results[] = [
            'method' => $method,
            'path' => $path,
            'error' => $e->getMessage(),
        ];
    }
}
echo json_encode(['ok' => true, 'results' => $results, 'routeCount' => count($results)], JSON_THROW_ON_ERROR);
