#!/usr/bin/env node
/**
 * Emit gin-style Go routes from hub-lift WebIR.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { renderGoBody } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "go";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-go-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function renderGo(routes, origin) {
  /** @type {string[]} */
  const routeLines = [];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toUpperCase();
    routeLines.push(`\tr.${m}(${JSON.stringify(r.path)}, func(c *gin.Context) {`);
    const body = renderGoBody(r.body);
    if (body.hole) holeCount += 1;
    for (const line of body.lines) routeLines.push(`\t\t${line}`);
    routeLines.push("\t})");
  }
  if (routes.length === 0) {
    holeCount += 1;
    routeLines.push('\tpanic("hub:empty-webir")');
  }
  const routesSource = [
    "package main",
    "",
    `// Chrysalis hub emit: ${origin} -> go (routes)`,
    'import "github.com/gin-gonic/gin"',
    "",
    "func registerHubRoutes(r *gin.Engine) {",
    ...routeLines,
    "}",
    "",
  ].join("\n");
  const mainSource = [
    "package main",
    "",
    `// Chrysalis hub emit: ${origin} -> go (main)`,
    'import "github.com/gin-gonic/gin"',
    "",
    "func main() {",
    "\tr := gin.Default()",
    "\tregisterHubRoutes(r)",
    '\tr.Run("127.0.0.1:8080")',
    "}",
    "",
  ].join("\n");
  return { routesSource, mainSource, holeCount };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { routesSource, mainSource, holeCount } = renderGo(routes, origin);
  const outDir = join(projectDir, "generated", "go");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "routes.go"), routesSource, "utf8");
  await writeFile(join(outDir, "main.go"), mainSource, "utf8");
  await writeFile(join(outDir, "go.mod"), `module chrysalis-hub-go\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.10.0\n`, "utf8");
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "go",
    path: "hub-webir-go",
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
