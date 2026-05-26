#!/usr/bin/env node
/**
 * Emit gin-style Go routes from hub-lift WebIR.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "go";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-go-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

/**
 * @param {unknown} value
 */
function goLiteral(value) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return "nil";
}

function renderGo(routes, origin) {
  const lines = [
    "package main",
    "",
    `// Chrysalis hub emit: ${origin} -> go`,
    'import "github.com/gin-gonic/gin"',
    "",
    "func main() {",
    "\tr := gin.Default()",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toUpperCase();
    if (r.body.kind === "literal") {
      const v = r.body.value;
      if (v !== null && typeof v === "object") {
        const pairs = Object.entries(v)
          .map(([k, val]) => `"${k}": ${goLiteral(val)}`)
          .join(", ");
        lines.push(`\tr.${m}(${JSON.stringify(r.path)}, func(c *gin.Context) {`);
        lines.push(`\t\tc.JSON(200, gin.H{${pairs}})`);
        lines.push("\t})");
      } else {
        lines.push(`\tr.${m}(${JSON.stringify(r.path)}, func(c *gin.Context) {`);
        if (typeof v === "string") {
          lines.push(`\t\tc.String(200, ${goLiteral(v)})`);
        } else if (typeof v === "boolean" || typeof v === "number") {
          lines.push(`\t\tc.JSON(200, ${goLiteral(v)})`);
        } else {
          lines.push(`\t\tc.Status(200)`);
        }
        lines.push("\t})");
      }
    } else {
      holeCount += 1;
      lines.push(`\tr.${m}(${JSON.stringify(r.path)}, func(c *gin.Context) {`);
      lines.push(`\t\t// HOLE: ${r.body.reason}`);
      lines.push(`\t\tpanic(${JSON.stringify(r.body.reason)})`);
      lines.push("\t})");
    }
  }
  if (routes.length === 0) {
    holeCount += 1;
    lines.push('\tpanic("hub:empty-webir")');
  }
  lines.push("\t_ = r");
  lines.push("}");
  lines.push("");
  return { source: lines.join("\n"), holeCount };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { source, holeCount } = renderGo(routes, origin);
  const outDir = join(projectDir, "generated", "go");
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "main.go"), source, "utf8");
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
