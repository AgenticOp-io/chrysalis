#!/usr/bin/env node
/**
 * Emit Ktor hub routes from hub-lift WebIR (probe-friendly HubRoutes.kt).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { ktorRoutePath, renderKotlinBody } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "kotlin";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-kotlin-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function renderKotlin(routes, origin) {
  const lines = [
    `// Chrysalis hub emit: ${origin} -> kotlin (routes)`,
    "package hub",
    "",
    "import io.ktor.server.application.*",
    "import io.ktor.server.response.*",
    "import io.ktor.server.routing.*",
    "import io.ktor.http.*",
    "",
    "fun Application.hubRoutes() {",
    "    routing {",
  ];
  let holeCount = 0;
  for (const r of routes) {
    const m = r.method.toLowerCase();
    lines.push(`        ${m}(${JSON.stringify(ktorRoutePath(r.path))}) {`);
    const body = renderKotlinBody(r.body, r.path);
    if (body.hole) holeCount += 1;
    for (const line of body.lines) lines.push(`            ${line}`);
    lines.push("        }");
  }
  if (routes.length === 0) holeCount += 1;
  lines.push("    }");
  lines.push("}", "");
  return { hubRoutesSource: `${lines.join("\n")}\n`, holeCount };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { hubRoutesSource, holeCount } = renderKotlin(routes, origin);
  const rel = "src/main/kotlin/hub/HubRoutes.kt";
  const outDir = join(projectDir, "generated", "kotlin");
  await mkdir(join(outDir, "src/main/kotlin/hub"), { recursive: true });
  await writeFile(join(outDir, rel), hubRoutesSource, "utf8");
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "kotlin",
    path: "hub-webir-kotlin",
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
