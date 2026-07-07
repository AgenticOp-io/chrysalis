#!/usr/bin/env node
/**
 * Emit Akka HTTP hub routes from hub-lift WebIR (probe-friendly HubRoutes.scala).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { akkaHttpMethodDir, akkaPathMatcher, renderScalaBody } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "scala";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-scala-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

function renderScala(routes, origin) {
  const lines = [
    `// Chrysalis hub emit: ${origin} -> scala (routes)`,
    "package hub",
    "",
    "import akka.http.scaladsl.server.Directives._",
    "import akka.http.scaladsl.model._",
    "import akka.http.scaladsl.server.Route",
    "import spray.json.DefaultJsonProtocol._",
    "import spray.json._",
    "",
    "object HubRoutes {",
    "  val routes: Route = concat(",
  ];
  let holeCount = 0;
  /** @type {string[]} */
  const routeExprs = [];
  for (const r of routes) {
    const dir = akkaHttpMethodDir(r.method);
    const pathMatch = akkaPathMatcher(r.path);
    const body = renderScalaBody(r.body, r.path);
    if (body.hole) holeCount += 1;
    routeExprs.push(`    ${dir}(${pathMatch}) { ${body.lines.join(" ")} }`);
  }
  if (routes.length === 0) holeCount += 1;
  lines.push(routeExprs.length > 0 ? routeExprs.join(",\n") : '    get(path("hub-empty")) { complete("HOLE: empty webir") }');
  lines.push("  )", "}", "");
  return { hubRoutesSource: `${lines.join("\n")}\n`, holeCount };
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { hubRoutesSource, holeCount } = renderScala(routes, origin);
  const rel = "src/main/scala/hub/HubRoutes.scala";
  const outDir = join(projectDir, "generated", "scala");
  await mkdir(join(outDir, "src/main/scala/hub"), { recursive: true });
  await writeFile(join(outDir, rel), hubRoutesSource, "utf8");
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "scala",
    path: "hub-webir-scala",
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
