#!/usr/bin/env node
/** Emit PHP hub router from WebIR (literal returns lowered; holes explicit). */
import { emitNativeFromHub } from "./hub-native-emit-shared.mjs";
import { renderPhpBody, toPhpRoutePattern } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "javascript";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-php-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

/**
 * @param {ReturnType<typeof import('./hub-webir-routes.mjs').listHubWebRoutes>} routes
 * @param {string} origin
 */
function renderPhp(routes, origin) {
  const lines = [
    "<?php",
    "declare(strict_types=1);",
    "",
    `// Chrysalis hub emit: ${origin} -> php`,
    "",
    "/**",
    " * @param mixed $value",
    " * @return array{status:int,body:string,headers:array<string,string>}",
    " */",
    "function hub_json($value): array {",
    "    return [",
    "        'status' => 200,",
    "        'body' => json_encode($value, JSON_THROW_ON_ERROR),",
    "        'headers' => ['Content-Type' => 'application/json; charset=utf-8'],",
    "    ];",
    "}",
    "",
    "/**",
    " * @return array{status:int,body:string,headers:array<string,string>}",
    " */",
    "function hub_handle_request(string $method, string $path): array {",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const pattern = toPhpRoutePattern(r.path);
    lines.push(`    if ($method === ${JSON.stringify(r.method)} && preg_match(${JSON.stringify(`/${pattern}/`)}, $path)) {`);
    const body = renderPhpBody(r.body);
    if (body.hole) holeCount += 1;
    for (const line of body.lines) lines.push(`        ${line}`);
    lines.push("    }");
    lines.push("");
  }
  if (routes.length === 0) {
    holeCount += 1;
    lines.push('    throw new RuntimeException("hub:empty-webir");');
  }
  lines.push("    return ['status' => 404, 'body' => 'not found', 'headers' => ['Content-Type' => 'text/plain']];");
  lines.push("}");
  lines.push("");
  lines.push("if (PHP_SAPI !== 'cli' || !getenv('CHRYSALIS_HUB_PHP_PROBE')) {");
  lines.push("    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';");
  lines.push("    $result = hub_handle_request($_SERVER['REQUEST_METHOD'] ?? 'GET', $path);");
  lines.push("    http_response_code($result['status']);");
  lines.push("    foreach ($result['headers'] as $k => $v) {");
  lines.push("        header($k . ': ' . $v);");
  lines.push("    }");
  lines.push("    echo $result['body'];");
  lines.push("}");
  lines.push("");
  return {
    files: { "index.php": `${lines.join("\n")}\n` },
    holeCount,
  };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const report = await emitNativeFromHub(projectDir, origin, "php", "hub-webir-php", renderPhp);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
