#!/usr/bin/env node
/**
 * Emit Vapor hub routes from hub-lift WebIR (probe-friendly routes.swift).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { renderSwiftBody, vaporRouteArgs } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "swift";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-swift-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function renderSwift(routes, origin) {
  const lines = [
    `// Chrysalis hub emit: ${origin} -> swift (routes)`,
    "import Vapor",
    "",
    "public func hubRoutes(_ routes: RoutesBuilder) throws {",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toLowerCase();
    const args = vaporRouteArgs(r.path);
    lines.push(`    routes.${m}(${args}) { req in`);
    const body = renderSwiftBody(r.body, r.path);
    if (body.hole) holeCount += 1;
    for (const line of body.lines) lines.push(`        ${line}`);
    lines.push("    }");
  }
  if (routes.length === 0) holeCount += 1;
  lines.push("}", "");
  return { routesSource: `${lines.join("\n")}\n`, holeCount };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { routesSource, holeCount } = renderSwift(routes, origin);
  const rel = "Sources/HubRoutes/routes.swift";
  const outDir = join(projectDir, "generated", "swift");
  await mkdir(join(outDir, "Sources/HubRoutes"), { recursive: true });
  await writeFile(join(outDir, rel), routesSource, "utf8");
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "swift",
    path: "hub-webir-swift",
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
