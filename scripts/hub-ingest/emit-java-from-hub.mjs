#!/usr/bin/env node
/**
 * Emit Spring-style Java routes from hub-lift WebIR.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadHubRoutes } from "./hub-load-routes.mjs";
import { javaMethodParams, renderJavaBody, toSpringPath } from "./hub-native-body-emit.mjs";

function parseArgs(argv) {
  const projectDir = argv[2];
  let origin = "java";
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--origin" && argv[i + 1]) origin = argv[++i];
  }
  if (!projectDir) throw new Error("usage: emit-java-from-hub.mjs <projectDir> --origin <lang>");
  return { projectDir, origin };
}

const JAVA_RESERVED_METHODS = new Set([
  "notify",
  "notifyAll",
  "wait",
  "getClass",
  "hashCode",
  "equals",
  "toString",
  "clone",
  "finalize",
]);

/**
 * @param {string} name
 */
function javaHandlerName(name) {
  let safe = name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^(\d)/, "_$1") || "handler";
  if (JAVA_RESERVED_METHODS.has(safe)) safe = `${safe}_route`;
  return safe;
}

/**
 * @param {import('./hub-webir-routes.mjs').listHubWebRoutes extends (...args: any) => infer R ? R : never} routes
 */
function renderJava(routes, origin) {
  const lines = [
    "package hub;",
    "",
    "import org.springframework.web.bind.annotation.*;",
    "import java.util.Map;",
    "import java.util.HashMap;",
    "",
    `/** Chrysalis hub emit: ${origin} -> java */`,
    "@RestController",
    "public class HubRoutes {",
  ];
  let holeCount = 0;
  const annFor = {
    GET: "GetMapping",
    POST: "PostMapping",
    PUT: "PutMapping",
    PATCH: "PatchMapping",
    DELETE: "DeleteMapping",
    HEAD: "GetMapping",
    OPTIONS: "GetMapping",
  };
  for (const r of routes) {
    const ann = annFor[r.method.toUpperCase()] ?? "GetMapping";
    const fn = javaHandlerName(r.handlerName);
    const springPath = toSpringPath(r.path);
    lines.push(`  @${ann}(${JSON.stringify(springPath)})`);
    const body = renderJavaBody(r.body, r.path);
    if (body.hole) holeCount += 1;
    if (r.body.kind === "structured") {
      const params = javaMethodParams(r.path, /** @type {object} */ (r.body.value));
      const paramList = params.annotations.length > 0 ? params.annotations.join(", ") : params.signature;
      lines.push(`  public ${body.returnType} ${fn}(${paramList}) {`);
    } else {
      lines.push(`  public ${body.returnType} ${fn}() {`);
    }
    for (const line of body.lines) lines.push(`    ${line}`);
    lines.push("  }");
    lines.push("");
  }
  if (routes.length === 0) {
    holeCount += 1;
    lines.push("  // HOLE: no routes in hub WebIR");
    lines.push('  public void empty() { throw new UnsupportedOperationException("hub:empty-webir"); }');
  }
  lines.push("}");
  lines.push("");
  return { source: lines.join("\n"), holeCount };
}

async function writeEmitReport(projectDir, origin, report) {
  await mkdir(join(projectDir, ".chrysalis"), { recursive: true });
  await writeFile(join(projectDir, ".chrysalis", `hub.${origin}.emit.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function main() {
  const { projectDir, origin } = parseArgs(process.argv);
  const { routes } = await loadHubRoutes(projectDir, origin);
  const { source, holeCount } = renderJava(routes, origin);
  const outDir = join(projectDir, "generated", "java");
  await mkdir(join(outDir, "src/main/java/hub"), { recursive: true });
  await writeFile(join(outDir, "src/main/java/hub/HubRoutes.java"), source, "utf8");
  await writeFile(
    join(outDir, "pom.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>hub</groupId>\n  <artifactId>chrysalis-hub-java</artifactId>\n  <version>0.1.0</version>\n</project>\n`,
    "utf8",
  );
  const report = {
    kind: "chrysalis.hub.emit",
    schemaVersion: 1,
    origin,
    output: "java",
    path: "hub-webir-java",
    outDir,
    routeCount: routes.length,
    holeCount,
    generatedAt: new Date().toISOString(),
  };
  await writeEmitReport(projectDir, origin, report);
  console.log(JSON.stringify(report));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
