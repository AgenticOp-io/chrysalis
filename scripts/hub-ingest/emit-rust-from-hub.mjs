#!/usr/bin/env node
/**
 * Emit actix-web routes from hub-lift WebIR (probe-friendly routes.rs).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import {
  actixRoutePath,
  renderRustBody,
  rustHandlerSignature,
} from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "rust";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-rust-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function renderRust(routes, origin) {
  const lines = [
    `// Chrysalis hub emit: ${origin} -> rust (routes)`,
    "use actix_web::{web, HttpRequest, HttpResponse};",
    "",
    "pub fn configure(cfg: &mut web::ServiceConfig) {",
  ];
  const actixVerb = { GET: "get", POST: "post", PUT: "put", PATCH: "patch", DELETE: "delete", HEAD: "head" };
  let holeCount = 0;
  let idx = 0;
  for (const r of routes) {
    const fn = `h_${idx++}`;
    const verb = actixVerb[r.method.toUpperCase()] ?? "get";
    lines.push(`    cfg.route(${JSON.stringify(actixRoutePath(r.path))}, web::${verb}().to(${fn}));`);
  }
  if (routes.length === 0) holeCount += 1;
  lines.push("}", "");

  idx = 0;
  for (const r of routes) {
    const fn = `h_${idx++}`;
    const sig = rustHandlerSignature(r.path, r.body);
    const body = renderRustBody(r.body, r.path);
    if (body.hole) holeCount += 1;
    lines.push(`async fn ${fn}(${sig}) -> HttpResponse {`);
    for (const line of body.lines) lines.push(`    ${line}`);
    lines.push("}", "");
  }

  const routesSource = `${lines.join("\n")}\n`;
  const mainSource = [
    `// Chrysalis hub emit: ${origin} -> rust (main)`,
    "use actix_web::{web, App, HttpServer};",
    "",
    "mod routes;",
    "",
    "#[actix_web::main]",
    "async fn main() -> std::io::Result<()> {",
    "    HttpServer::new(|| App::new().configure(routes::configure))",
    '        .bind(("127.0.0.1", 8080))?',
    "        .run()",
    "        .await",
    "}",
    "",
  ].join("\n");

  return { routesSource, mainSource, holeCount };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { routesSource, mainSource, holeCount } = renderRust(routes, origin);
  const outDir = join(projectDir, "generated", "rust");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "routes.rs"), routesSource, "utf8");
  await writeFile(join(outDir, "main.rs"), mainSource, "utf8");
  await writeFile(
    join(outDir, "Cargo.toml"),
    '[package]\nname = "chrysalis-hub-rust"\nversion = "0.1.0"\nedition = "2021"\n\n[dependencies]\nactix-web = "4"\nserde_json = "1"\n',
    "utf8",
  );
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "rust",
    path: "hub-webir-rust",
    outDir,
    routeCount: routes.length,
    holeCount,
    generatedAt: new Date().toISOString(),
  };
  await mkdir(join(projectDir, ".chrysalis"), { recursive: true });
  await writeFile(join(projectDir, ".chrysalis", `hub.${origin}.emit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
